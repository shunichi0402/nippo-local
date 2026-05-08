import { createVuetify } from 'vuetify';
import 'vuetify/styles';

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'nippoLight',
    themes: {
      nippoLight: {
        dark: false,
        colors: {
          background: '#f7f8fa',
          surface: '#ffffff',
          primary: '#2563eb',
          secondary: '#0f766e',
          accent: '#7c3aed',
          error: '#b42318',
          info: '#0369a1',
          success: '#047857',
          warning: '#b54708'
        }
      }
    }
  },
  defaults: {
    VBtn: {
      rounded: 'sm'
    },
    VCard: {
      rounded: 'sm',
      elevation: 0
    },
    VTextField: {
      density: 'comfortable',
      variant: 'outlined'
    },
    VTextarea: {
      density: 'comfortable',
      variant: 'outlined'
    },
    VSelect: {
      density: 'comfortable',
      variant: 'outlined'
    }
  }
});

