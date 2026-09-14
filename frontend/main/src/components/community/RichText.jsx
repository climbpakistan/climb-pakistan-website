import { TOKEN_RE, normalizeHashtag } from '../../utils/socialText';

/**
 * RichText — renders plain-text bodies/comments with social formatting:
 *   **bold**   → <strong>
 *   @username  → the user's community profile
 *   #hashtag   → the hashtag results page
 *   https://…  → the external URL (new tab)
 *
 * The text is never injected as HTML — React escapes every fragment, so this
 * stays safe even though the source is user-generated plain text.
 */
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
      const name = normalizeHashtag(token);
      if (!name) {
        nodes.push(token);
      } else {
        nodes.push(
          <a
            key={`${match.index}-${token}`}
            href={`/community/hashtag/${encodeURIComponent(name)}`}
            className="rich-hashtag"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Keep the user's original capitalization for display. */}
            {token}
          </a>
        );
      }
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
