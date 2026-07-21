// Cycle the phone's bottom nav to simulate the app being used live
  (function(){
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    var navItems = document.querySelectorAll('.phone-nav > div');
    var cards = document.querySelectorAll('.phone-card');
    var navIndex = 0;

    function cycleNav(){
      navItems.forEach(function(el){ el.classList.remove('active'); });
      navItems[navIndex].classList.add('active');
      navIndex = (navIndex + 1) % navItems.length;
    }

    var cardIndex = 0;
    function cyclePulse(){
      cards.forEach(function(el){ el.classList.remove('pulse'); });
      if (cards.length){
        cards[cardIndex].classList.add('pulse');
        cardIndex = (cardIndex + 1) % cards.length;
      }
    }

    if (navItems.length) setInterval(cycleNav, 1800);
    if (cards.length) setInterval(cyclePulse, 1400);
  })();

  // Gentle fade-up reveal for sections as they scroll into view
  (function(){
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var targets = document.querySelectorAll('.feature-card, .step-card, .browser-mock, .download-banner');
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    targets.forEach(function(el){
      el.style.opacity = '0';
      el.style.transform = 'translateY(18px)';
      el.style.transition = 'opacity .6s ease, transform .6s ease';
    });

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(function(el){ observer.observe(el); });
  })();