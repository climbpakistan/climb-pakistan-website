import { useEffect, useRef, useState } from 'react';
import { useCommunity } from '../../hooks/CommunityContext';
import {
  searchCommunityUsers,
  getSuggestedAccounts,
  getHashtagSuggestions,
  getTopHashtags,
} from '../../api';
import { getActiveTagToken } from '../../utils/socialText';

/**
 * MentionTextarea — a plain <textarea> that adds Instagram-style autocomplete:
 *
 *   @abu          → dropdown of community usernames
 *   #sport        → dropdown of existing hashtags
 *
 * Selecting a result inserts it into the text. The body stays plain text — the
 * backend re-parses and validates everything — so nothing here is trusted.
 *
 * All other textarea props (placeholder, rows, maxLength, id, autoFocus,
 * disabled, …) are forwarded.
 */
export default function MentionTextarea({
  value,
  onChange,
  rows = 3,
  placeholder,
  maxLength,
  disabled = false,
  className = '',
  ...rest
}) {
  const { token } = useCommunity();
  const textareaRef = useRef(null);
  const seqRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  // The token ({ symbol, query, start }) the dropdown belongs to.
  const tokenRef = useRef(null);

  // Close on outside click.
  useEffect(() => {
    function onDown(e) {
      if (textareaRef.current && !textareaRef.current.closest('.mention-field')?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  async function loadOptions(symbol, query) {
    const seq = ++seqRef.current;
    try {
      let items;
      if (symbol === '@') {
        if (query.length >= 2) {
          const data = await searchCommunityUsers(query);
          items = (data.users || []).map((u) => ({ kind: 'user', ...u }));
        } else {
          // Bare "@": suggest accounts so the dropdown is useful immediately.
          const data = await getSuggestedAccounts(token, 8);
          const q = query.toLowerCase();
          items = (data.users || [])
            .filter((u) => u.username.startsWith(q))
            .slice(0, 6)
            .map((u) => ({ kind: 'user', ...u }));
        }
      } else if (query.length === 0) {
        const data = await getTopHashtags(8);
        items = (data.hashtags || []).map((h) => ({ kind: 'hashtag', ...h }));
      } else {
        const data = await getHashtagSuggestions(query);
        items = (data.hashtags || []).map((h) => ({ kind: 'hashtag', ...h }));
      }
      if (seq !== seqRef.current) return;
      setOptions(items);
      setActiveIndex(-1);
      setOpen(items.length > 0);
    } catch {
      if (seq !== seqRef.current) return;
      setOptions([]);
      setOpen(false);
    }
  }

  function handleChange(e) {
    const next = e.target.value;
    const caret = e.target.selectionStart ?? next.length;
    onChange(next);

    const token = getActiveTagToken(next, caret);
    tokenRef.current = token;
    if (!token) {
      seqRef.current += 1; // invalidate any in-flight suggestion request
      setOpen(false);
      setOptions([]);
      return;
    }
    if (token.symbol === '@' && token.query.length > 20) {
      setOpen(false);
      return;
    }
    loadOptions(token.symbol, token.query);
  }

  function insertOption(option) {
    const token = tokenRef.current;
    if (!token) return;
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? value.length;
    const insertion = option.kind === 'user'
      ? `@${option.username} `
      : `#${option.displayName || option.name} `;

    const next = `${value.slice(0, token.start)}${insertion}${value.slice(caret)}`;
    const nextCaret = token.start + insertion.length;
    onChange(next);
    setOpen(false);
    setOptions([]);
    tokenRef.current = null;

    // Restore focus + caret after the value is applied.
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handleKeyDown(e) {
    if (!open || options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (activeIndex >= 0) {
        e.preventDefault();
        insertOption(options[activeIndex]);
      } else {
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="mention-field">
      <textarea
        {...rest}
        ref={textareaRef}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && options.length > 0 && (
        <ul className="mention-dropdown" role="listbox">
          {options.map((opt, i) => (
            <li key={opt.kind === 'user' ? `u-${opt.id}` : `h-${opt.name}`}>
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === i}
                className={`mention-option${activeIndex === i ? ' is-active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); insertOption(opt); }}
              >
                {opt.kind === 'user' ? (
                  <>
                    {opt.profileImageUrl ? (
                      <img src={opt.profileImageUrl} alt="" className="mention-option-avatar" />
                    ) : (
                      <span className="mention-option-avatar mention-option-avatar--fallback">
                        {(opt.username || '?')[0].toUpperCase()}
                      </span>
                    )}
                    <span className="mention-option-text">
                      <span className="mention-option-primary">@{opt.username}</span>
                      {opt.name && <span className="mention-option-secondary">{opt.name}</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mention-option-hash" aria-hidden="true">#</span>
                    <span className="mention-option-text">
                      <span className="mention-option-primary">#{opt.displayName || opt.name}</span>
                      {opt.postCount > 0 && (
                        <span className="mention-option-secondary">
                          {opt.postCount} {opt.postCount === 1 ? 'post' : 'posts'}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
