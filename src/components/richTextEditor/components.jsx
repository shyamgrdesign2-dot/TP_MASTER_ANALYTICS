import React from 'react';
import ReactDOM from 'react-dom';

export const Button = React.forwardRef(
  ({ className, active, reversed, style, onMouseDown, ...props }, ref) => {
    const handleMouseDown = (e) => {
      e.preventDefault();
      if (onMouseDown) {
        onMouseDown(e);
      }
    };

    return (
      <span
        {...props}
        ref={ref}
        className={className}
        onMouseDown={handleMouseDown}
        style={{
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          backgroundColor: active ? '#EDE9FE' : 'transparent',
          border: '1px solid transparent',
          color: active ? '#7C3AED' : '#6B7280',
          fontWeight: active ? '500' : '400',
          userSelect: 'none',
          width: '32px',
          height: '32px',
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }
        }}
      />
    );
  }
);

const iconPaths = {
  format_bold: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.25391 9.00008C9.25391 8.26675 9.85391 7.66675 10.5872 7.66675H14.0006C15.7472 7.66675 17.1672 9.08675 17.1672 10.8334C17.1672 12.5801 15.7472 14.0001 14.0006 14.0001H9.25391V9.00008Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.25391 14H15.5872C17.3339 14 18.7539 15.42 18.7539 17.1667C18.7539 18.9133 17.3339 20.3333 15.5872 20.3333H10.5872C9.85391 20.3333 9.25391 19.7333 9.25391 19V14V14Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  format_list_bulleted: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="6" fill="currentColor" fillOpacity="0.08"/>
      <path d="M8 14H8.00667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 18H8.00667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 10H8.00667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.3359 14H20.0026" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.3359 18H20.0026" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.3359 10H20.0026" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  format_list_numbered: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.3359 14H20.0026" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.3359 18H20.0026" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.3359 10H20.0026" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.51638 10.0464V9.07494H9.20882V13.5352H8.12126V10.0464H7.51638Z" fill="currentColor"/>
      <path d="M6.49303 18.12C6.63152 18.01 6.69466 17.9591 6.68244 17.9672C7.08162 17.6373 7.39526 17.3664 7.62336 17.1546C7.85553 16.9428 8.05105 16.7208 8.20991 16.4886C8.36877 16.2565 8.44819 16.0304 8.44819 15.8104C8.44819 15.6434 8.4095 15.5131 8.33211 15.4194C8.25471 15.3257 8.13863 15.2789 7.98384 15.2789C7.82906 15.2789 7.70686 15.3379 7.61725 15.4561C7.53171 15.5701 7.48894 15.733 7.48894 15.9449H6.48081C6.48896 15.5986 6.56228 15.3094 6.70077 15.0773C6.84333 14.8451 7.02866 14.674 7.25677 14.564C7.48894 14.454 7.74556 14.3991 8.02661 14.3991C8.51133 14.3991 8.87589 14.5233 9.12028 14.7718C9.36875 15.0202 9.49298 15.3441 9.49298 15.7432C9.49298 16.1791 9.34431 16.5844 9.04696 16.9591C8.74961 17.3298 8.3708 17.6923 7.91052 18.0467H9.56019V18.8959H6.49303V18.12Z" fill="currentColor"/>
    </svg>
  ),
};

export const Icon = React.forwardRef(({ children, className, style, ...props }, ref) => {
  const icon = iconPaths[children];
  
  return (
    <span
      {...props}
      ref={ref}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
        width: '20px',
        height: '20px',
        ...style,
      }}
    >
      {icon || children}
    </span>
  );
});

export const Menu = React.forwardRef(({ className, style, ...props }, ref) => (
  <div
    {...props}
    data-test-id='menu'
    ref={ref}
    className={className}
    style={{
      ...style,
    }}
  />
));

export const Portal = ({ children }) => {
  return typeof document === 'object'
    ? ReactDOM.createPortal(children, document.body)
    : null;
};

export const Toolbar = React.forwardRef(
  ({ className, style, ...props }, ref) => (
    <Menu
      {...props}
      ref={ref}
      className={className}
      style={{
        position: 'relative',
        padding: '12px 16px',
        margin: '0',
        display: 'flex',
        gap: '12px',
        borderTop: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        borderRadius: '0 0 8px 8px',
        alignItems: 'center',
        ...style,
      }}
    />
  )
);
