import moment from 'moment-timezone'
import ReactDOM from 'react-dom/client'
import * as Yup from 'yup'

import RouteIndex from './routes'

import * as serviceWorkerRegistration from './pwa-register'
import reportWebVitals from './report-web-vitals'

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

moment.tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format()

const root = ReactDOM.createRoot(document.getElementById('root') as any)
root.render(<RouteIndex />)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register()

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
