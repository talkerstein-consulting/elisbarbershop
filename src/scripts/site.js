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

  /* marquee */
  var items = ["Gents Haircut","Beard Trim","Kids' Cuts","Line-ups","Salon Services","Walk-ins Welcome","Since 2017"];
  var track = document.getElementById("marquee");
  function buildSet(){
    var frag = document.createDocumentFragment();
    items.forEach(function(t){
      var s = document.createElement("span");
      s.className = "marquee-item";
      s.innerHTML = t + '<span class="sep">✦</span>';
      frag.appendChild(s);
    });
    return frag;
  }
  track.appendChild(buildSet()); track.appendChild(buildSet());

  /* reveal on scroll */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
  }, {threshold:0.14, rootMargin:"0px 0px -8% 0px"});
  document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });

  /* gallery lightbox */
  var lb = document.getElementById("lightbox"), lbImg = document.getElementById("lbImg");
  document.querySelectorAll("#galleryGrid img").forEach(function(img){
    img.addEventListener("click", function(){ lbImg.src = img.currentSrc || img.src; lb.classList.add("open"); });
  });
  function closeLb(){ lb.classList.remove("open"); lbImg.src = ""; }
  document.getElementById("lbX").addEventListener("click", closeLb);
  lb.addEventListener("click", function(e){ if(e.target === lb) closeLb(); });
  window.addEventListener("keydown", function(e){ if(e.key === "Escape") closeLb(); });

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
})();
