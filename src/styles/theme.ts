export const theme = {
  colors: {
    primary: {
      main: '#36B7CD', // Updated calming teal-blue
      light: '#DEF5FA',
      dark: '#2A95A8',
    },
    secondary: {
      main: '#78A6C8', // Soft blue
      light: '#EAF4FB',
      dark: '#5C8CAD',
    },
    background: {
      default: '#F0F4F8', // Light blue-gray
      paper: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #F0F4F8 0%, #DEF5FA 100%)',
    },
    text: {
      primary: '#2D3748',
      secondary: '#4A5568',
      light: '#A0AEC0',
    },
    accent: {
      success: '#68D391',
      warning: '#F6E05E',
      error: '#FC8181',
      info: '#36B7CD',
    },
    social: {
      facebook: '#1877F2',
      twitter: '#1DA1F2',
      instagram: '#E1306C',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Inter", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '1rem',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '2rem',
    round: '50%',
  },
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
  },
  transitions: {
    default: '0.3s ease-in-out',
    fast: '0.15s ease-in-out',
    slow: '0.5s ease-in-out',
  },
} 