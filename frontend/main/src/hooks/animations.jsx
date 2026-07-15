import { Children, cloneElement, isValidElement } from 'react';
import { useInView } from './useInView';

export function AnimatedSection({ children, className = '', ...props }) {
  const [ref, isVisible] = useInView({ threshold: 0.08 });
  return (
    <section ref={ref} className={`reveal ${isVisible ? 'is-visible' : ''} ${className}`} {...props}>
      {children}
    </section>
  );
}

export function StaggeredGrid({ children, className = '', baseDelay = 0, stepDelay = 0.08 }) {
  const [ref, isVisible] = useInView({ threshold: 0.06 });
  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) =>
        isValidElement(child)
          ? cloneElement(child, {
              style: {
                ...(child.props.style || {}),
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + i * stepDelay}s, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${baseDelay + i * stepDelay}s`,
              },
            })
          : child
      )}
    </div>
  );
}

export function AnimatedPageHeader({ children }) {
  return (
    <section className="page-header page-header--enhanced">
      <div className="page-header-bg-grid" />
      <div className="page-header-glow" />
      <div className="container">
        <div className="hero-entrance">{children}</div>
      </div>
    </section>
  );
}
