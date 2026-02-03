export default function ShopFooter() {
  return (
    <footer className="w-full bg-gray-50 border-t border-slate-200 py-8 mt-12 text-center">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6 px-6 max-w-7xl mx-auto">
        <div className="text-gray-500 text-sm flex items-center gap-2">
          <svg width="18" height="18" fill="none" viewBox="0 0 20 20">
            <rect x="4" y="4" width="12" height="12" stroke="#255285" strokeWidth={2} />
            <path d="M4 4l8 7-8 5" stroke="#255285" strokeWidth={2} />
          </svg>
          <span>
            &copy; 2025 Heladería Cosmos · Todos los derechos reservados
          </span>
        </div>
        <div className="flex gap-3 items-center">
          <a href="mailto:info@cosmos.com" className="text-[#255285] hover:underline text-sm flex items-center gap-1 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M14.872 14.287l6.522 6.52a2.996 2.996 0 0 1 -2.218 1.188l-.176 .005h-14a2.995 2.995 0 0 1 -2.394 -1.191l6.521 -6.522l2.318 1.545l.116 .066a1 1 0 0 0 .878 0l.116 -.066l2.317 -1.545z"/>
              <path d="M2 9.535l5.429 3.62l-5.429 5.43z"/>
              <path d="M22 9.535v9.05l-5.43 -5.43z"/>
              <path d="M12.44 2.102l.115 .066l8.444 5.629l-8.999 6l-9 -6l8.445 -5.63a1 1 0 0 1 .994 -.065z"/>
            </svg>
            info@cosmos.com
          </a>
        </div>
      </div>
    </footer>
  );
}