import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const initialRoute = { tab: 'overview', asset: null, scroll: 0 }

export default function useDashboardNavigation() {
  const [route, setRoute] = useState(() => window.history.state?.dashboard || initialRoute)
  const current = useRef(route)
  current.current = route

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    window.history.replaceState({ ...window.history.state, dashboard: current.current }, '')
    const restore = (event) => {
      const next = event.state?.dashboard
      if (next && (next.tab !== current.current.tab || next.asset !== current.current.asset)) setRoute(next)
    }
    window.addEventListener('popstate', restore)
    return () => {
      window.removeEventListener('popstate', restore)
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: route.scroll || 0, left: 0, behavior: 'instant' })
  }, [route])

  const navigate = (tab, asset = null) => {
    if (tab === route.tab && asset === route.asset) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      return
    }
    window.history.replaceState({ ...window.history.state, dashboard: { ...route, scroll: window.scrollY } }, '')
    const next = { tab, asset, scroll: 0 }
    window.history.pushState({ dashboard: next }, '')
    setRoute(next)
  }

  return {
    activeTab: route.tab,
    viewingAsset: route.asset,
    changeTab: (tab) => navigate(tab),
    viewAsset: (asset) => navigate(route.tab, asset),
    back: () => window.history.back(),
  }
}
