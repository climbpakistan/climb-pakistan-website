import vikeReact from 'vike-react/config'

export default {
  extends: [vikeReact],
  // Pre-render the whole site, but allow dynamic pages that provide their own
  // onBeforePrerenderStart() URLs (e.g. community profiles) to be skipped when
  // the API returns none — without failing the build.
  prerender: { partial: true },
}
