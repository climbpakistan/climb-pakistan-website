export { data };

// The feed is fetched client-side (see getPosts in +Page.jsx) so it can attach
// the viewer's vote/save state. This data hook intentionally returns nothing.
async function data() {
  return {};
}
