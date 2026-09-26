import { useReducer } from 'react'

// Keep completed entrances across tab unmounts, until the dashboard is reloaded.
const completedEntrances = new Set()

export default function useChartEntrance(page) {
  const [, refresh] = useReducer(value => value + 1, 0)

  return chart => {
    const key = JSON.stringify([page, chart])
    return {
      isAnimationActive: !completedEntrances.has(key),
      onAnimationEnd: () => {
        if (completedEntrances.has(key)) return
        completedEntrances.add(key)
        refresh()
      },
    }
  }
}
