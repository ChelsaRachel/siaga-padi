import moment from 'moment-timezone'
import ReactDOM from 'react-dom/client'
import * as Yup from 'yup'

import RouteIndex from './routes'

import reportWebVitals from './report-web-vitals'
import { registerServiceWorker } from '@/services/pwa.service'

Yup.setLocale({
  mixed: {
    default: 'Invalid data',
    required: 'This is required',
    notType: 'Invalid data',
  },
  number: {
    min: 'Min ${min} character',
    max: 'Max ${max} character',
  },
  string: {
    min: 'Min ${min} character',
    max: 'Max ${max} character',
  },
})

import './index.css'

// Phosphor icon CSS — bundled locally (replaces the former /cdn-assets proxy).
// Only the weights renderIcon() supports; `thin` is unused and excluded.
import '@phosphor-icons/web/regular'
import '@phosphor-icons/web/fill'
import '@phosphor-icons/web/bold'
import '@phosphor-icons/web/light'
import '@phosphor-icons/web/duotone'

moment.tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format()

const root = ReactDOM.createRoot(document.getElementById('root') as any)
root.render(<RouteIndex />)

registerServiceWorker()

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
