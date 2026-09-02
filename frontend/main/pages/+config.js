import vikeReact from 'vike-react/config'

export default {
  extends: [vikeReact],
  // Serve the app through Vike's built-in server so that non-pre-rendered
  // dynamic routes (e.g. new community profiles / posts created after deploy)
  // are server-side rendered at request time instead of being captured by the
  // old static "/" fallback (which falsely hydrated the home page).
  server: true,
  // Pre-render the whole site, but allow dynamic pages that provide their own
  // onBeforePrerenderStart() URLs (e.g. community profiles) to be skipped when
  // the API returns none — without failing the build.
  prerender: { partial: true },
}
