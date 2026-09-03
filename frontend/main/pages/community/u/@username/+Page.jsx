import { useRef, useState, useEffect } from 'react';
import { useData } from 'vike-react/useData';
import Seo from '../../../../src/components/Seo';
import PostCard from '../../../../src/components/community/PostCard';
import VerificationBadge from '../../../../src/components/community/VerificationBadge';
import { useCommunity } from '../../../../src/hooks/CommunityContext';
import {
  communityUpdateProfile,
  getUserPosts,
  getUserComments,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  getFollowStatus,
  getMyVotes,
} from '../../../../src/api';
import { AnimatedPageHeader } from '../../../../src/hooks/animations';
import { formatPostDate } from '../../../../src/utils/communityPosts';

export { Page };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4000;

function formatJoined(value) {
  if (!value) return 'Joined —';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Joined —';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function formatPoints(value) {
  return (Number(value) || 0).toLocaleString();
}

function readImageMeta(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) return resolve({ valid: false, error: 'Please choose an image file.' });
    if (file.size > MAX_IMAGE_BYTES) return resolve({ valid: false, error: 'Image must be smaller than 5 MB.' });
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: 'Image dimensions are too large. Please use an image under 4000px.' });
      } else {
        resolve({ valid: true, url });
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ valid: false, error: 'That file could not be read as an image.' }); };
    img.src = url;
  });
}

function EmptyTab({ title, text }) {
  return (
    <div className="profile-tab-empty">
      <h3 className="profile-tab-empty-title">{title}</h3>
      <p className="profile-tab-empty-text">{text}</p>
    </div>
  );
}

const ROLE_LABELS = {
  athlete: 'Athlete',
  coach: 'Coach',
  climbing_enthusiast: 'Climbing Enthusiast',
  gym_or_organization: 'Gym or Organization',
};
const DISCIPLINE_LABELS = { speed: 'Speed', lead: 'Lead', bouldering: 'Bouldering' };
const EXPERIENCE_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', professional: 'Professional' };

function ProfileHeader({ profile, isOwner, isFollowing, followBusy, canFollow, onFollow, onEdit, onShowFollowers, onShowFollowing }) {
  const initial = (profile.username || profile.name || '?')[0].toUpperCase();
  const athlete = profile.athlete;
  const followerCount = profile.followerCount ?? 0;
  const followingCount = profile.followingCount ?? 0;

  // Build experience label like "Professional Athlete"
  const experienceLabel = profile.experienceLevel
    ? `${EXPERIENCE_LABELS[profile.experienceLevel] || profile.experienceLevel}${profile.communityRole === 'athlete' ? ' Athlete' : ''}`
    : null;

  return (
    <div className="profile-hero">
      <div className="profile-avatar">
        {profile.profileImageUrl ? (
          <img src={profile.profileImageUrl} alt={`${profile.username}'s profile`} />
        ) : (
          <span className="community-avatar-fallback">{initial}</span>
        )}
      </div>

      <div className="profile-hero-main">
        {/* Name, username, and followers/following in one row */}
        <div className="profile-hero-top">
          <div className="profile-hero-info">
            <h1 className="profile-name">{profile.name || `@${profile.username}`}</h1>
            <p className="profile-username">@{profile.username}<VerificationBadge verification={profile.verification} /></p>
          </div>

          <div className="profile-follow-stats">
            <button type="button" className="profile-follow-stat" disabled={isOwner} onClick={onShowFollowers}>
              <strong>{followerCount.toLocaleString()}</strong> <span>Followers</span>
            </button>
            <button type="button" className="profile-follow-stat" disabled={isOwner} onClick={onShowFollowing}>
              <strong>{followingCount.toLocaleString()}</strong> <span>Following</span>
            </button>
          </div>
        </div>

        {/* City */}
        {profile.city ? <p className="profile-city">📍 {profile.city}</p> : null}

        {/* Experience level */}
        {experienceLabel ? <p className="profile-experience-tag">{experienceLabel}</p> : null}

        {/* Bio */}
        {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}

        {/* Action buttons */}
        <div className="profile-actions-row">
          {isOwner ? (
            <button type="button" className="btn btn-outline profile-action-btn" onClick={onEdit}>Edit Profile</button>
          ) : canFollow ? (
            <button
              type="button"
              className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'} profile-action-btn`}
              onClick={onFollow}
              disabled={followBusy}
            >
              {followBusy ? '…' : isFollowing ? 'Following' : 'Follow'}
            </button>
          ) : null}

          {profile.instagramUrl ? (
            <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn profile-action-btn profile-action-btn--instagram">
              Instagram
            </a>
          ) : null}

          {athlete ? (
            <a href={`/athletes/${athlete.slug}`} className="btn profile-action-btn profile-action-btn--athlete">
              Athlete Profile
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EditProfile({ profile, onCancel, onSaved }) {
  const { token } = useCommunity();
  const [bio, setBio] = useState(profile.bio || '');
  const [city, setCity] = useState(profile.city || '');
  const [instagramUrl, setInstagramUrl] = useState(profile.instagramUrl || '');
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(profile.profileImageUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const urlRef = useRef(null);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) { setAvatar(null); setPreview(profile.profileImageUrl || null); return; }
    const meta = await readImageMeta(file);
    if (!meta.valid) { setError(meta.error); e.target.value = ''; return; }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = meta.url;
    setAvatar(file);
    setPreview(meta.url);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { user } = await communityUpdateProfile(token, { bio, avatar, city, instagramUrl });
      onSaved(user);
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="community-form profile-edit-form" onSubmit={handleSubmit} noValidate>
      <h2 className="profile-edit-title">Edit Profile</h2>

      <div className="form-row community-avatar-field">
        <label>Profile image</label>
        <div className="community-avatar-input">
          <div className="community-avatar-preview">
            {preview ? <img src={preview} alt="Avatar preview" /> : <span className="community-avatar-fallback">{profile.username[0].toUpperCase()}</span>}
          </div>
          <div className="community-avatar-controls">
            <input type="file" name="avatar" accept="image/*" onChange={handleAvatarChange} />
            <p className="form-hint">PNG/JPG, up to 5&nbsp;MB, under 4000px.</p>
          </div>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          rows="4"
          maxLength={300}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell the community a little about yourself."
        />
        <p className="form-hint">{bio.length}/300</p>
      </div>

      <div className="form-row">
        <label htmlFor="edit-city">City / Region</label>
        <input
          type="text"
          id="edit-city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Islamabad, Karachi"
          maxLength={100}
        />
      </div>

      <div className="form-row">
        <label htmlFor="edit-instagram">Instagram Link</label>
        <input
          type="url"
          id="edit-instagram"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://www.instagram.com/yourusername"
        />
      </div>

      {error && <p className="form-status form-status--error" role="alert">{error}</p>}

      <div className="community-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function FollowList({ list, busy, denormalized }) {
  // `list` is the denormalized avatar/name list saved on CachedUser (backend
  // provides { username, name, profileImageUrl } entries) OR a full profile list.
  const items = Array.isArray(denormalized) && denormalized.length
    ? denormalized
    : (Array.isArray(list) ? list : []);
  return (
    <div className="profile-follow-list">
      {items.length === 0 ? (
        <EmptyTab title={busy ? 'Loading…' : 'Nothing here yet'} text="No members to show." />
      ) : (
        items.map((m) => (
          <a key={m.username} href={`/community/u/${m.username}`} className="profile-follow-row">
            <span className="community-avatar-fallback">
              {(m.username || m.name || '?')[0].toUpperCase()}
            </span>
            <span className="profile-follow-row-meta">
              <span className="profile-follow-row-name">@{m.username} <VerificationBadge verification={m.verification} size={12} /></span>
              {m.name ? <span className="profile-follow-row-bio">{m.name}</span> : null}
            </span>
          </a>
        ))
      )}
    </div>
  );
}

function Page() {
  const { username, profile } = useData();
  const { user, token, isGuest, updateUser } = useCommunity();
  const [tab, setTab] = useState('posts');
  const [editing, setEditing] = useState(false);

  // ── Follow state ──
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followerCount, setFollowerCount] = useState(profile?.followerCount ?? 0);
  const followingCount = profile?.followingCount ?? 0;

  // ── Tab content state ──
  const [posts, setPosts] = useState([]);
  const [postsBusy, setPostsBusy] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsBusy, setCommentsBusy] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followListBusy, setFollowListBusy] = useState(false);

  // Owner detection happens client-side (the cached user has the username).
  const isOwner = !isGuest && user?.username === profile?.username;
  const canFollow = !isGuest && !isOwner;

  // Load the viewer's follow status for this profile once authenticated.
  useEffect(() => {
    let active = true;
    if (isGuest || isOwner || !profile) { setIsFollowing(false); return () => { active = false; }; }
    getFollowStatus(token, profile.id)
      .then((data) => { if (active) setIsFollowing(!!data.following); })
      .catch(() => {});
    return () => { active = false; };
  }, [token, isGuest, isOwner, profile?.id]);

  // Load tab content lazily on first activation.
  const loaded = useRef({});
  useEffect(() => {
    if (!profile || loaded.current[tab]) return;
    loaded.current[tab] = true;

    if (tab === 'posts') {
      setPostsBusy(true);
      getUserPosts(profile.username)
        .then(async (data) => {
          const arr = data.posts || [];
          const mine = await getMyVotes(token, { posts: arr.map((p) => p.id) }).catch(() => ({ posts: {} }));
          const mineMap = mine?.posts || {};
          setPosts(arr.map((p) => ({ ...p, myVote: mineMap[p.id] || 0 })));
        })
        .catch(() => {} )
        .finally(() => setPostsBusy(false));
    } else if (tab === 'comments') {
      setCommentsBusy(true);
      getUserComments(profile.username)
        .then((data) => setComments(data.comments || []))
        .catch(() => {})
        .finally(() => setCommentsBusy(false));
    } else if (tab === 'followers' || tab === 'following') {
      setFollowListBusy(true);
      const req = tab === 'followers' ? getFollowers(profile.username) : getFollowing(profile.username);
      req
        .then((data) => {
          const users = (data && (data.followers || data.following)) || [];
          if (tab === 'followers') setFollowers(users);
          else setFollowing(users);
        })
        .catch(() => {})
        .finally(() => setFollowListBusy(false));
    }
  }, [tab, profile, token]);

  async function handleFollow() {
    if (isGuest || isOwner || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowUser(token, profile.id);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followUser(token, profile.id);
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch {
      // leave state on the failure side; user can retry
    } finally {
      setFollowBusy(false);
    }
  }

  function openList(next) {
    setTab(next);
    setEditing(false);
  }

  if (!profile) {
    return (
      <>
        <Seo
          title="Profile Not Found"
          description="This community profile could not be found."
          path={`/community/u/${username}`}
          noIndex
        />
        <section className="page-header">
          <div className="container">
            <h1 className="page-title">Profile Not Found</h1>
            <p className="page-sub">We couldn&rsquo;t find that community profile.</p>
            <a href="/community/feed" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>Back to Community</a>
          </div>
        </section>
      </>
    );
  }

  // `saved` is only shown on the owner's own profile.
  const ownerTabs = isOwner ? ['posts', 'comments', 'followers', 'following', 'saved'] : ['posts', 'comments', 'followers', 'following'];

  function renderTab() {
    if (tab === 'saved') {
      return (
        <EmptyTab
          title="No saved posts yet"
          text="Posts you save will appear here. Saving posts arrives in a later step."
        />
      );
    }
    if (tab === 'comments') {
      if (commentsBusy) return <EmptyTab title="Loading…" text="Fetching recent comments." />;
      if (comments.length === 0) return <EmptyTab title="No comments yet" text="This member hasn't commented yet." />;
      return (
        <ul className="profile-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="profile-comment-item">
              <p className="profile-comment-body">{c.body}</p>
              <a className="profile-comment-context" href={`/community/post/${c.postId}`}>
                Comment on &ldquo;{(c.post && (c.post.title || 'a post')) || 'a post'}&rdquo; · {formatPostDate(c.createdAt)}
              </a>
            </li>
          ))}
        </ul>
      );
    }
    if (tab === 'followers') {
      return <FollowList busy={followListBusy} denormalized={followers} />;
    }
    if (tab === 'following') {
      return <FollowList busy={followListBusy} denormalized={following} />;
    }
    // posts (default)
    if (postsBusy) return <EmptyTab title="Loading…" text="Fetching latest posts." />;
    if (posts.length === 0) return <EmptyTab title="No posts yet" text="This member hasn't posted anything yet." />;
    return (
      <div className="community-feed-list">
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    );
  }

  const desc = profile.bio
    ? `${profile.bio}`
    : `Community profile of @${profile.username} on Climb Pakistan.`;

  return (
    <>
      <Seo
        title={`@${profile.username} — Community Profile`}
        description={desc}
        path={`/community/u/${profile.username}`}
      />

      <AnimatedPageHeader>
        <div className="container">

        </div>
      </AnimatedPageHeader>

      <section className="section-tight">
        <div className="container community-profile-layout">
          <ProfileHeader
            profile={{ ...profile, followerCount, followingCount }}
            isOwner={isOwner}
            isFollowing={isFollowing}
            followBusy={followBusy}
            canFollow={canFollow}
            onFollow={handleFollow}
            onEdit={() => setEditing((v) => !v)}
            onShowFollowers={() => openList('followers')}
            onShowFollowing={() => openList('following')}
          />

          {editing ? (
            <EditProfile
              profile={profile}
              onCancel={() => setEditing(false)}
              onSaved={(freshUser) => { updateUser(freshUser); setEditing(false); }}
            />
          ) : (
            <>
              <div className="profile-tabs" role="tablist" aria-label="Profile sections">
                {ownerTabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    className={`profile-tab${tab === t ? ' is-active' : ''}`}
                    onClick={() => setTab(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className="profile-tab-content" role="tabpanel">
                {renderTab()}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}