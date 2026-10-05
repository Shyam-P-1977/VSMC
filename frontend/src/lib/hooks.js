import { useCallback, useEffect, useRef, useState } from 'react'
import { apiError } from '../api/client'
import toast from 'react-hot-toast'

/** Fetch helper with loading/error state + reload. `fn` is re-run when deps change. */
export function useAsync(fn, deps = [], { silent = false } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fnRef.current())
    } catch (e) {
      const msg = apiError(e)
      setError(msg)
      if (!silent) toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [silent])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, deps)
  return { data, loading, error, reload: run, setData }
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
