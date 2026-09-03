import { useEffect, useRef, useState } from 'react';
import { navigate } from 'vike/client/router';
import { usePageContext } from 'vike-react/usePageContext';
import Seo from '../../../../../src/components/Seo';
import PostForm from '../../../../../src/components/community/PostForm';
import { useCommunity } from '../../../../../src/hooks/CommunityContext';
import { getPost, updatePost } from '../../../../../src/api';

export { Page };

function Page() {
  const pageContext = usePageContext();
  const postId = pageContext?.routeParams?.postId;
  const { token, user, isGuest, initializing } = useCommunity();

  const [post, setPost] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');

  // Keep the latest token in a ref so the initial-load effect runs once per
  // postId (on mount) without re-fetching when the token resolves.
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getPost(tokenRef.current, postId);
        if (active) {
          setPost(data.post);
          setStatus('ready');
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Post not found.');
          setStatus('error');
        }
      }
    }
    load();
    return () => { active = false; };
  }, [postId]);

  // Only the post owner may edit — the backend enforces this too.
  const isOwner = !!(post && user && post.author?.username === user.username);

  function handleCancel() {
    navigate(`/community/post/${postId}`);
  }

  async function handleSubmit(fields) {
    await updatePost(token, postId, fields);
    navigate(`/community/post/${postId}`);
  }

  return (
    <>
      <Seo
        title="Edit Post"
        description="Edit your post in the Climb Pakistan Community."
        path={`/community/post/${postId}/edit`}
        noIndex
      />

      <section className="page-header page-header--enhanced">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container">
          <div className="hero-entrance">              <h1 className="page-title">Edit Post</h1>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container community-form-wrap">
          {initializing || status === 'loading' ? (
            <p className="profile-loading">Loading…</p>
          ) : status === 'error' ? (
            <div className="community-empty-state">
              <h2 className="community-empty-title">Post not found</h2>
              <p className="community-empty-text">{errorMsg}</p>
              <a href="/community/feed" className="btn btn-primary community-empty-btn">Back to the feed</a>
            </div>
          ) : isGuest ? (
            <div className="profile-card profile-card--guest">
              <h2 className="profile-username">Log in to edit your post</h2>
              <div className="community-form-actions">
                <a href="/community/login" className="btn btn-primary">Log In</a>
              </div>
            </div>
          ) : !isOwner ? (
            <div className="profile-card profile-card--guest">
              <h2 className="profile-username">Not your post</h2>
              <p className="profile-name">You can only edit your own posts.</p>
              <a href={`/community/post/${postId}`} className="btn btn-outline">Back to the post</a>
            </div>
          ) : (
            <PostForm
              initial={{
                type: post.type,
                title: post.title,
                body: post.body,
                category: post.category,
                externalUrl: post.externalUrl,
                imageUrl: post.imageUrl,
                poll: post.poll,
              }}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitLabel="Save changes"
            />
          )}
        </div>
      </section>
    </>
  );
}
