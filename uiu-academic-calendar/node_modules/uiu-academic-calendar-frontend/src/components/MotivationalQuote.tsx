import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function MotivationalQuote() {
  const [show, setShow] = useState(false)
  const [quote, setQuote] = useState('')

  useEffect(() => {
    // Fetch a random quote from API
    async function fetchQuote() {
      try {
        const response = await axios.get('https://api.quotable.io/random?tags=education,inspirational,success,wisdom')
        const data = response.data
        setQuote(`${data.content} – ${data.author}`)
      } catch (error) {
        // Fallback quote if API fails
        setQuote('Education is the most powerful weapon which you can use to change the world. – Nelson Mandela')
      }
    }
    
    fetchQuote()
    
    // Show after a short delay
    const showTimer = setTimeout(() => setShow(true), 800)
    
    // Hide after 6 seconds
    const hideTimer = setTimeout(() => setShow(false), 7000)
    
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!show) return null

  return (
    <div className="quote-popup">
      <div className="quote-content">
        <div className="quote-icon">✨</div>
        <p className="quote-text">{quote}</p>
      </div>
    </div>
  )
}
