import Lenis from "lenis";

(function(){
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* smooth inertia scrolling (skipped for reduced-motion users) */
  var lenis = null;
  if(!reduceMotion){
    lenis = new Lenis({ anchors: true });
    (function lenisRaf(time){ lenis.raf(time); requestAnimationFrame(lenisRaf); })(0);
  }

  /* footer curtain reveal: keep --footer-h in sync so the last section's
     negative margin exactly matches the pinned footer's real height */
  var footerEl = document.querySelector("footer");
  if(footerEl){
    var setFooterH = function(){
      document.documentElement.style.setProperty("--footer-h", footerEl.offsetHeight + "px");
    };
    setFooterH();
    if(window.ResizeObserver){ new ResizeObserver(setFooterH).observe(footerEl); }
    else{ window.addEventListener("resize", setFooterH); }

    // reactive card-reveal: the top card stays full-size (never smaller than
    // the footer sitting behind it) and gets pulled up and away, faster than
    // normal scroll, during the last footerHeight px — fully uncovering the
    // footer card underneath instead of just clipping its corners.
    var curtain = document.querySelector(".curtain-edge");
    if(curtain && !reduceMotion){
      var cardTicking = false;
      function renderCardReveal(){
        cardTicking = false;
        var fh = footerEl.offsetHeight || 1;
        var footerTop = footerEl.getBoundingClientRect().top;
        var p = (window.innerHeight - footerTop) / fh;
        p = Math.min(1, Math.max(0, p));
        curtain.style.transform = "translateY(" + (-fh * p).toFixed(1) + "px)";
        curtain.style.boxShadow = "0 " + (24 + 24 * p).toFixed(0) + "px " + (48 + 32 * p).toFixed(0) + "px -16px rgba(0,0,0," + (0.48 + 0.16 * p).toFixed(2) + ")";
      }
      function onCardScroll(){
        if(!cardTicking){ cardTicking = true; requestAnimationFrame(renderCardReveal); }
      }
      renderCardReveal();
      window.addEventListener("scroll", onCardScroll, {passive:true});
      window.addEventListener("resize", onCardScroll);
    }
  }

  /* notice bar: dismiss + auto-tuck on scroll */
  var notice = document.getElementById("notice");
  function hideNotice(){ notice.classList.add("hide"); document.body.classList.add("notice-off"); }
  if(notice){
    document.getElementById("noticeClose").addEventListener("click", hideNotice);
  } else {
    document.body.classList.add("notice-off");
  }

  /* nav background + notice tuck on scroll */
  var nav = document.getElementById("nav");
  function onScroll(){
    var y = window.scrollY;
    nav.classList.toggle("scrolled", y > 40);
    if(y > 10 && notice && !notice.classList.contains("hide")) hideNotice();
  }
  onScroll(); window.addEventListener("scroll", onScroll, {passive:true});

  /* mobile hamburger menu */
  var burger = document.getElementById("navBurger");
  var mobileMenu = document.getElementById("mobileMenu");
  if(burger && mobileMenu){
    function setMenu(open){
      mobileMenu.classList.toggle("open", open);
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.documentElement.style.overflow = open ? "hidden" : "";
    }
    burger.addEventListener("click", function(){ setMenu(!mobileMenu.classList.contains("open")); });
    mobileMenu.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click", function(){ setMenu(false); });
    });
    window.addEventListener("keydown", function(e){
      if(e.key === "Escape" && mobileMenu.classList.contains("open")) setMenu(false);
    });
  }

  /* nav scroll-spy: sliding pill tracks the active section (or the current standalone page) */
  var navLinksEl = document.getElementById("navLinks");
  var navIndicator = document.getElementById("navIndicator");
  if(navLinksEl && navIndicator){
    var spyLinks = Array.prototype.slice.call(navLinksEl.querySelectorAll("a.link[data-key]"));
    var spyActiveKey = null;

    function moveIndicatorTo(link){
      if(!link){ navIndicator.style.opacity = "0"; return; }
      var lr = link.getBoundingClientRect(), cr = navLinksEl.getBoundingClientRect();
      navIndicator.style.width = lr.width + "px";
      navIndicator.style.transform = "translateY(-50%) translateX(" + (lr.left - cr.left) + "px)";
      navIndicator.style.opacity = "1";
    }
    function setActiveKey(key){
      spyActiveKey = key;
      spyLinks.forEach(function(a){ a.classList.toggle("is-active", a.getAttribute("data-key") === key); });
      moveIndicatorTo(spyLinks.filter(function(a){ return a.getAttribute("data-key") === key; })[0]);
    }

    var currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    var pageKey = null;
    spyLinks.forEach(function(a){ if(a.getAttribute("href") === currentPath) pageKey = a.getAttribute("data-key"); });

    if(pageKey){
      // standalone page (e.g. /about): the nav link for this page just stays active
      setActiveKey(pageKey);
      window.addEventListener("resize", function(){ setActiveKey(pageKey); });
    } else {
      // homepage: highlight whichever section is crossing the upper third of the viewport
      var spySections = spyLinks
        .map(function(a){ return {key:a.getAttribute("data-key"), el:document.getElementById(a.getAttribute("data-key"))}; })
        .filter(function(s){ return s.el; });
      if(spySections.length){
        function onSpyScroll(){
          var probe = window.innerHeight * 0.35;
          var found = null;
          spySections.forEach(function(s){
            var r = s.el.getBoundingClientRect();
            if(r.top <= probe && r.bottom > probe) found = s.key;
          });
          if(found !== spyActiveKey) setActiveKey(found);
        }
        onSpyScroll();
        window.addEventListener("scroll", onSpyScroll, {passive:true});
        window.addEventListener("resize", onSpyScroll);
      }
    }
  }

  /* marquee — seamless measured loop, ported from React Bits' LogoLoop animation core */
  var mqOuter = document.querySelector(".marquee");
  var mqTrack = document.getElementById("marquee");
  if(mqOuter && mqTrack){
    var MQ_ITEMS = ["Gents Haircut","Beard Trim","Kids' Cuts","Line-ups","Salon Services","Walk-ins Welcome","Since 2017"];
    var MQ_SPEED = 46;       // px/s, cruising speed
    var MQ_HOVER_SPEED = 14; // px/s, decelerated (not a hard stop) on hover
    var MQ_TAU = 0.25;       // smoothing time-constant for the easing, matches LogoLoop's SMOOTH_TAU
    var MQ_MIN_COPIES = 2, MQ_COPY_HEADROOM = 2;

    var mqCopyCount = MQ_MIN_COPIES, mqSeqWidth = 0;
    var mqOffset = 0, mqVelocity = 0, mqLastTs = null, mqHovered = false, mqRaf = null;

    function buildSequence(){
      var seq = document.createElement("div");
      seq.className = "marquee-seq";
      MQ_ITEMS.forEach(function(t){
        var s = document.createElement("span");
        s.className = "marquee-item";
        s.innerHTML = t + '<span class="sep">✦</span>';
        seq.appendChild(s);
      });
      return seq;
    }
    function mqRenderCopies(){
      mqTrack.innerHTML = "";
      for(var i=0;i<mqCopyCount;i++){
        var seq = buildSequence();
        if(i===0) seq.setAttribute("data-seq", "0");
        mqTrack.appendChild(seq);
      }
    }
    // measure one sequence's width and grow the copy count until it always fills + overlaps the viewport,
    // so the modulo-wrapped translate below never reveals a gap regardless of container width
    function mqMeasure(){
      var seqEl = mqTrack.querySelector('[data-seq="0"]');
      if(!seqEl) return;
      var w = seqEl.getBoundingClientRect().width;
      if(w <= 0) return;
      mqSeqWidth = Math.ceil(w);
      var needed = Math.ceil(mqOuter.clientWidth / mqSeqWidth) + MQ_COPY_HEADROOM;
      var next = Math.max(MQ_MIN_COPIES, needed);
      if(next !== mqCopyCount){ mqCopyCount = next; mqRenderCopies(); requestAnimationFrame(mqMeasure); }
    }

    mqRenderCopies();
    requestAnimationFrame(mqMeasure);

    if(window.ResizeObserver){ new ResizeObserver(mqMeasure).observe(mqOuter); }
    else{ window.addEventListener("resize", mqMeasure); }

    mqOuter.addEventListener("mouseenter", function(){ mqHovered = true; });
    mqOuter.addEventListener("mouseleave", function(){ mqHovered = false; });

    function mqAnimate(ts){
      if(mqLastTs === null) mqLastTs = ts;
      var dt = Math.max(0, ts - mqLastTs) / 1000;
      mqLastTs = ts;
      var target = mqHovered ? MQ_HOVER_SPEED : MQ_SPEED;
      var ease = 1 - Math.exp(-dt / MQ_TAU);
      mqVelocity += (target - mqVelocity) * ease;
      if(mqSeqWidth > 0){
        var next = mqOffset + mqVelocity * dt;
        mqOffset = ((next % mqSeqWidth) + mqSeqWidth) % mqSeqWidth;
        mqTrack.style.transform = "translate3d(" + (-mqOffset).toFixed(2) + "px,0,0)";
      }
      mqRaf = requestAnimationFrame(mqAnimate);
    }
    if(reduceMotion){ mqTrack.style.transform = "translate3d(0,0,0)"; }
    else{ mqRaf = requestAnimationFrame(mqAnimate); }
  }

  /* reveal on scroll */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
  }, {threshold:0.14, rootMargin:"0px 0px -8% 0px"});
  document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });

  /* gallery lightbox */
  var lb = document.getElementById("lightbox"), lbImg = document.getElementById("lbImg");
  if(lb && lbImg){
    document.querySelectorAll("#galleryGrid img").forEach(function(img){
      img.addEventListener("click", function(){ lbImg.src = img.currentSrc || img.src; lb.classList.add("open"); });
    });
    var closeLb = function(){ lb.classList.remove("open"); lbImg.src = ""; };
    document.getElementById("lbX").addEventListener("click", closeLb);
    lb.addEventListener("click", function(e){ if(e.target === lb) closeLb(); });
    window.addEventListener("keydown", function(e){ if(e.key === "Escape") closeLb(); });
  }

  /* gallery masonry: balanced columns on desktop/tablet, CSS slider on mobile */
  var gGrid = document.getElementById("galleryGrid");
  if(gGrid){
    var gFigs = Array.prototype.slice.call(gGrid.querySelectorAll("figure"));
    function layoutMasonry(){
      var w = window.innerWidth;
      if(w <= 560){ // mobile: clear inline layout so the CSS slider takes over
        gGrid.style.position = ""; gGrid.style.height = "";
        gFigs.forEach(function(f){ f.style.position=""; f.style.left=""; f.style.top=""; f.style.width=""; f.style.margin=""; });
        return;
      }
      var cols = w <= 900 ? 3 : 4;
      var gap = w <= 900 ? 10 : 14;
      var cw = (gGrid.clientWidth - gap*(cols-1)) / cols;
      var colH = []; for(var i=0;i<cols;i++) colH[i] = 0;
      gGrid.style.position = "relative";
      gFigs.forEach(function(f){
        f.style.position = "absolute"; f.style.margin = "0"; f.style.width = cw + "px";
        var m = 0; for(var i=1;i<cols;i++){ if(colH[i] < colH[m]) m = i; }
        f.style.left = (m*(cw+gap)) + "px";
        f.style.top = colH[m] + "px";
        colH[m] += f.offsetHeight + gap;
      });
      var max = colH[0]; for(var i=1;i<cols;i++){ if(colH[i] > max) max = colH[i]; }
      gGrid.style.height = max + "px";
    }
    gFigs.forEach(function(f){
      var img = f.querySelector("img");
      if(img && !img.complete){ img.addEventListener("load", layoutMasonry); img.addEventListener("error", layoutMasonry); }
    });
    window.addEventListener("load", layoutMasonry);
    var _rt; window.addEventListener("resize", function(){ clearTimeout(_rt); _rt = setTimeout(layoutMasonry, 120); });
    layoutMasonry();
  }

  /* ---- HERO: cinematic scroll video (canvas frame-buffer, native-video fallback) ---- */
  var VIDEO_URL = "/banner.mp4";
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("heroCanvas");
  var video = document.getElementById("heroVideo");
  var poster = document.getElementById("heroPoster");
  var content = document.getElementById("heroContent");
  var hint = document.getElementById("scrollHint");
  if(hero && canvas && video && content && hint){
  var ctx = canvas.getContext("2d");

  var frames = [], usingBuffer = false, lastIdx = -1, posterHidden = false;
  var vidReady = false, vidDur = 0, seeking = false;

  function hidePoster(){ if(poster && !posterHidden){ posterHidden = true; poster.classList.add("off"); } }
  function scrollDown(){
    var t = document.getElementById("why");
    if(!t) return;
    if(lenis) lenis.scrollTo(t);
    else t.scrollIntoView({behavior:"smooth"});
  }
  hint.addEventListener("click", scrollDown);
  hint.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); scrollDown(); } });

  function resizeCanvas(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    var w = Math.round(r.width*dpr), h = Math.round(r.height*dpr);
    if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
    lastIdx = -1;
  }
  window.addEventListener("resize", resizeCanvas, {passive:true});
  resizeCanvas();

  function drawFrame(frame){
    if(!frame) return;
    var cw = canvas.width, ch = canvas.height;
    var s = Math.max(cw/frame.width, ch/frame.height);
    var dw = frame.width*s, dh = frame.height*s;
    ctx.clearRect(0,0,cw,ch);
    ctx.drawImage(frame,(cw-dw)/2,(ch-dh)/2,dw,dh);
  }
  function heroProgress(){
    var rect = hero.getBoundingClientRect();
    var total = hero.offsetHeight - window.innerHeight;
    var scrolled = Math.min(Math.max(-rect.top,0),total);
    return total > 0 ? scrolled/total : 0;
  }
  function enableFallback(){
    usingBuffer = false; canvas.classList.remove("on"); video.classList.add("on");
    video.addEventListener("loadedmetadata", function(){ vidDur = video.duration||0; vidReady = vidDur>0; });
    video.addEventListener("seeked", function(){ seeking = false; if(!posterHidden) hidePoster(); });
    video.addEventListener("canplay", hidePoster);
    video.load();
  }
  function bufferFrames(){
    return new Promise(function(resolve, reject){
      fetch(VIDEO_URL, {mode:"cors"}).then(function(res){
        if(!res.ok) throw new Error("fetch "+res.status); return res.blob();
      }).then(function(blob){
        var url = URL.createObjectURL(blob);
        var v = document.createElement("video");
        v.muted = true; v.playsInline = true; v.crossOrigin = "anonymous"; v.preload = "auto"; v.src = url;
        v.onloadedmetadata = function(){
          var scale = Math.min(1, 1024/v.videoWidth);
          var sw = Math.round(v.videoWidth*scale), sh = Math.round(v.videoHeight*scale);
          var count = 45, dur = v.duration, i = 0;
          (function next(){
            if(i >= count){ URL.revokeObjectURL(url); return resolve(); }
            v.currentTime = (i/(count-1))*(dur-0.05);
            var done = false;
            var to = setTimeout(function(){ if(!done){ done=true; step(); } }, 2000);
            v.onseeked = function(){ if(done) return; done=true; clearTimeout(to); step(); };
            function step(){
              (window.createImageBitmap ? createImageBitmap(v,{resizeWidth:sw,resizeHeight:sh}) : Promise.reject())
                .then(function(bmp){ frames.push(bmp); }).catch(function(){}).then(function(){ i++; next(); });
            }
          })();
        };
        v.onerror = function(){ URL.revokeObjectURL(url); reject(new Error("decode")); };
        setTimeout(function(){ if(frames.length===0) reject(new Error("timeout")); }, 15000);
      }).catch(reject);
    });
  }

  if(reduceMotion){
    hero.style.height = "100vh"; enableFallback(); hidePoster();
  } else {
    bufferFrames().then(function(){
      if(frames.length > 3){ usingBuffer = true; canvas.classList.add("on"); drawFrame(frames[0]); hidePoster(); }
      else { enableFallback(); }
    }).catch(function(){ enableFallback(); });

    var statement = document.getElementById("heroStatement");
    var cards = document.getElementById("heroCards");
    var cardsGrid = document.getElementById("heroCardsGrid");
    function cl(v){ return v<0?0:(v>1?1:v); }

    (function render(){
      var pr = heroProgress();
      if(usingBuffer && frames.length){
        var idx = Math.min(frames.length-1, Math.floor(pr*frames.length));
        if(idx !== lastIdx){ lastIdx = idx; drawFrame(frames[idx]); }
      } else if(vidReady){
        var target = pr*(vidDur-0.05);
        if(!seeking && Math.abs(video.currentTime-target) > 0.05){ seeking = true; try{ video.currentTime = target; }catch(e){ seeking=false; } }
      }

      // phase 1 — opening headline (fades out first)
      var hOp = cl(1 - (pr-0.04)/0.12);
      content.style.opacity = hOp.toFixed(3);
      content.style.transform = "translateY(" + (-pr*24).toFixed(1) + "px)";
      hint.style.opacity = hOp.toFixed(3);

      // phase 2 — heritage statement
      var sIn = cl((pr-0.20)/0.06), sOut = cl((0.46-pr)/0.06);
      var sOp = Math.min(sIn, sOut);
      statement.style.opacity = sOp.toFixed(3);
      statement.style.transform = "translateY(" + ((1-sIn)*22).toFixed(1) + "px)";

      // phase 3 — service cards wipe in over the video, then hold
      var cOp = Math.min(cl((pr-0.48)/0.05), cl((0.97-pr)/0.05));
      cards.style.opacity = cOp.toFixed(3);
      if(cOp > 0){
        var rp = cl((pr-0.50)/(0.72-0.50)) * 135;
        var dir = window.innerWidth < 768 ? "to bottom" : "to right";
        var mask = "linear-gradient(" + dir + ", black " + rp.toFixed(1) + "%, transparent " + (rp+15).toFixed(1) + "%)";
        cardsGrid.style.webkitMaskImage = mask;
        cardsGrid.style.maskImage = mask;
      }

      requestAnimationFrame(render);
    })();
  }
  } /* end hero guard */

  /* ---- store hours: live 3-state status (America/Toronto) ---- */
  var hoursList = document.getElementById("hoursList");
  var hoursStatusEl = document.getElementById("hoursStatus");
  if(hoursList && hoursStatusEl){
    // index 0=Sun..6=Sat; null = closed all day
    var SCHEDULE = [
      {open:8*60, close:17*60},  // Sun
      {open:8*60, close:19*60},  // Mon
      {open:8*60, close:19*60},  // Tue
      {open:8*60, close:19*60},  // Wed
      {open:8*60, close:19*60},  // Thu
      {open:8*60, close:17*60},  // Fri
      null                       // Sat — Shomer Shabbat
    ];
    var DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    function torontoNow(){
      // reconstruct Toronto wall-clock fields regardless of visitor's device timezone
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Toronto", weekday:"short", hour:"numeric", minute:"numeric", hour12:false
      }).formatToParts(new Date());
      var map = {}; parts.forEach(function(p){ map[p.type] = p.value; });
      var weekdayIdx = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(map.weekday);
      var hour = parseInt(map.hour, 10) % 24;
      var minute = parseInt(map.minute, 10);
      return {day: weekdayIdx, minutes: hour*60 + minute};
    }
    function fmtClock(mins){
      var h = Math.floor(mins/60), m = mins%60;
      var ampm = h >= 12 ? "PM" : "AM";
      var h12 = h % 12; if(h12 === 0) h12 = 12;
      return h12 + (m ? ":" + (m<10?"0":"")+m : "") + " " + ampm;
    }
    function fmtDuration(mins){
      var h = Math.floor(mins/60), m = mins%60;
      if(h <= 0) return m + "m";
      return h + "h" + (m ? " " + m + "m" : "");
    }
    function nextOpen(day, minutes){
      // walk forward up to 7 days to find the next open slot after "now"
      for(var i=0; i<=7; i++){
        var d = (day+i) % 7;
        var sched = SCHEDULE[d];
        if(sched){
          var startMin = (i===0) ? minutes : -1;
          if(sched.open > startMin) return {daysAhead:i, openAt:sched.open};
        }
      }
      return null;
    }

    function render(){
      var now = torontoNow();
      var today = SCHEDULE[now.day];
      var isOpenNow = !!today && now.minutes >= today.open && now.minutes < today.close;

      hoursList.querySelectorAll("li").forEach(function(li){
        var d = parseInt(li.getAttribute("data-day"), 10);
        li.classList.toggle("today", d === now.day);
        li.classList.remove("is-open", "is-closed");
        var badge = li.querySelector(".badge");
        if(d === now.day){
          li.classList.add(isOpenNow ? "is-open" : "is-closed");
          if(badge) badge.textContent = isOpenNow ? "Open now" : "Closed";
        } else if(badge){
          badge.textContent = "";
        }
      });

      hoursStatusEl.classList.remove("is-open", "is-closed");
      var txt = hoursStatusEl.querySelector(".txt");
      if(isOpenNow){
        hoursStatusEl.classList.add("is-open");
        txt.textContent = "Open now · closes at " + fmtClock(today.close);
      } else {
        hoursStatusEl.classList.add("is-closed");
        if(now.day === 6){
          txt.textContent = "Closed today · Shomer Shabbat";
        } else if(today && now.minutes < today.open){
          txt.textContent = "Closed · opens in " + fmtDuration(today.open - now.minutes);
        } else {
          var nxt = nextOpen(now.day, now.minutes);
          if(!nxt){ txt.textContent = "Closed"; }
          else if(nxt.daysAhead === 1){ txt.textContent = "Closed · opens tomorrow at " + fmtClock(nxt.openAt); }
          else { txt.textContent = "Closed · opens " + DAY_NAMES[(now.day+nxt.daysAhead)%7] + " at " + fmtClock(nxt.openAt); }
        }
      }
    }
    render();
    setInterval(render, 60000);
  }
})();
