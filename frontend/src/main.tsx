import React from 'react'
import ReactDOM from 'react-dom/client'
import { SocialSchedulerApp } from './SocialSchedulerApp'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SocialSchedulerApp onNavigateToDailyQuotes={() => console.log("Navigate to Daily Quotes")} />
  </React.StrictMode>,
)
