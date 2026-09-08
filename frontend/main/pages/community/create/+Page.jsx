import { useEffect } from 'react';
import { navigate } from 'vike/client/router';
import { usePageContext } from 'vike-react/usePageContext';
import Seo from '../../../src/components/Seo';
import PostForm from '../../../src/components/community/PostForm';
import { useCommunity } from '../../../src/hooks/CommunityContext';
import { createPost } from '../../../src/api';

export { Page };

function Page() {
  const { user, token, isGuest, initializing, openAuthPrompt } = useCommunity();
  const pageContext = usePageContext();
  // Pre-select the topic when arriving from a feed topic view
  // (e.g. /community/create?category=News).
  const initialCategory = pageContext?.urlParsed?.search?.category || '';

  // Guests are sent to the existing login/signup prompt once session state
  // has settled (running this during render would setState while rendering).
  useEffect(() => {
    if (!initializing && isGuest) {
      openAuthPrompt('You need an account to create a post.');
    }
  }, [initializing, isGuest, openAuthPrompt]);

  async function handleSubmit(fields) {
    const { post } = await createPost(token, fields);
    navigate(`/community/post/${post.id}`);
  }

  return (
    <>
      <Seo
        title="Create Post"
        description="Create a post in the Climb Pakistan Community."
        path="/community/create"
        noIndex
      />

      <section className="page-header page-header--enhanced">
        <div className="page-header-bg-grid"></div>
        <div className="page-header-glow"></div>
        <div className="container">
          <div className="hero-entrance">              <h1 className="page-title">Create Post</h1>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container community-form-wrap">
          {initializing ? (
            <p className="profile-loading">Loading…</p>
          ) : isGuest ? (
            <div className="profile-card profile-card--guest">
              <h2 className="profile-username">Create an account to post</h2>
              <p className="profile-name">
                You&apos;re browsing as a guest. Sign up or log in to start a
                discussion in the Climb Pakistan Community.
              </p>
              <div className="community-form-actions">
                <a href="/community/signup" className="btn btn-primary">Sign Up</a>
                <a href="/community/login" className="btn btn-outline">Log In</a>
              </div>
            </div>
          ) : (
            <>
              <p className="community-create-greeting">Posting as <strong>@{user.username}</strong></p>
              <PostForm
                initial={initialCategory ? { category: initialCategory } : {}}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/community/feed')}
                submitLabel="Publish"
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
