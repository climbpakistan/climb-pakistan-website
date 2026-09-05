/**
 * RichText — renders plain-text bodies/comments with social formatting:
 *   **bold**   → <strong>
 *   @username  → the user's community profile
 *   #hashtag   → the feed search for that term
 *   https://…  → the external URL (new tab)
 *
 * The text is never injected as HTML — React escapes every fragment, so this
 * stays safe even though the source is user-generated plain text.
 */

// Bold is matched first so its ** delimiters aren't consumed by the URL rule.
const TOKEN_RE = /(\*\*[^*]+\*\*|@[a-zA-Z][a-zA-Z0-9_]{2,19}|#[a-zA-Z0-9_]{2,40}|https?:\/\/[^\s<>"']+)/g;

export default function RichText({ text }) {
  if (!text) return null;

  const nodes = [];
  let last = 0;
  let match;
  TOKEN_RE.lastIndex = 0;

  while ((match = TOKEN_RE.exec(String(text))) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={`${match.index}-${token}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('@')) {
      const username = token.slice(1).toLowerCase();
      nodes.push(
        <a
          key={`${match.index}-${token}`}
          href={`/community/u/${encodeURIComponent(username)}`}
          className="rich-mention"
          onClick={(e) => e.stopPropagation()}
        >
          @{username}
        </a>
      );
    } else if (token.startsWith('#')) {
      const tag = token.slice(1);
      nodes.push(
        <a
          key={`${match.index}-${token}`}
          href={`/community/feed?search=${encodeURIComponent(tag)}`}
          className="rich-hashtag"
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </a>
      );
    } else {
      nodes.push(
        <a
          key={`${match.index}-${token}`}
          href={token}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="rich-url"
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </a>
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}