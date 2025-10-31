import React, { useEffect, useState } from 'react'

const quotes = [
  "Education is the most powerful weapon which you can use to change the world. – Nelson Mandela",
  "The beautiful thing about learning is that no one can take it away from you. – B.B. King",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "It always seems impossible until it's done. – Nelson Mandela",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "You are never too old to set another goal or to dream a new dream. – C.S. Lewis",
  "Strive for progress, not perfection.",
  "Every accomplishment starts with the decision to try.",
  "Your education is a dress rehearsal for a life that is yours to lead. – Nora Ephron",
  "The expert in anything was once a beginner.",
  "Learning is not attained by chance, it must be sought for with ardor. – Abigail Adams",
  "Today a reader, tomorrow a leader. – Margaret Fuller"
]

export default function MotivationalQuote() {
  const [show, setShow] = useState(false)
  const [quote, setQuote] = useState('')

  useEffect(() => {
    // Pick a random quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    setQuote(randomQuote)
    
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
