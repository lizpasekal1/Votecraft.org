(function() {
    'use strict';

    // Coin color cycle
    var front = document.querySelector('.coin-front');
    var back = document.querySelector('.coin-back');
    if (front) {
        var cycle = function() {
            setTimeout(function() { front.classList.add('teal'); }, 1500);
            setTimeout(function() { back.classList.add('teal'); }, 3000);
            setTimeout(function() { front.classList.remove('teal'); }, 7500);
            setTimeout(function() { back.classList.remove('teal'); }, 9000);
        };
        cycle();
        setInterval(cycle, 12000);
    }

    // Particles
    var container = document.getElementById('particles');
    if (container) {
        var colors = ['#14CCB0', '#2563eb', '#F32B44'];
        for (var i = 0; i < 12; i++) {
            var p = document.createElement('div');
            p.className = 'b-particle';
            p.style.left = (10 + Math.random() * 80) + '%';
            p.style.bottom = '0';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.animationDuration = (4 + Math.random() * 6) + 's';
            p.style.animationDelay = Math.random() * 8 + 's';
            container.appendChild(p);
        }
    }
})();
