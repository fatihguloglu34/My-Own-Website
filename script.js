
(function(){
	var r=document.documentElement,b=document.getElementById('tg');
	b.addEventListener('click',function(){
	var dark=r.getAttribute('data-theme')?r.getAttribute('data-theme')==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
	r.setAttribute('data-theme',dark?'light':'dark');
	});
	})();
	