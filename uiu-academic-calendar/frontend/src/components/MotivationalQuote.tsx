import React, { useEffect, useState } from 'react'

const quotes = [
  // Education & Learning
  "Education is the most powerful weapon which you can use to change the world. – Nelson Mandela",
  "The beautiful thing about learning is that no one can take it away from you. – B.B. King",
  "Learning is not attained by chance, it must be sought for with ardor. – Abigail Adams",
  "Education is not preparation for life; education is life itself. – John Dewey",
  "The more that you read, the more things you will know. The more that you learn, the more places you'll go. – Dr. Seuss",
  "Live as if you were to die tomorrow. Learn as if you were to live forever. – Mahatma Gandhi",
  "An investment in knowledge pays the best interest. – Benjamin Franklin",
  "Education is the passport to the future, for tomorrow belongs to those who prepare for it today. – Malcolm X",
  "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice. – Brian Herbert",
  "Your education is a dress rehearsal for a life that is yours to lead. – Nora Ephron",
  "Today a reader, tomorrow a leader. – Margaret Fuller",
  "Tell me and I forget, teach me and I may remember, involve me and I learn. – Benjamin Franklin",
  "The expert in anything was once a beginner.",
  "Study while others are sleeping; work while others are loafing; prepare while others are playing. – William Ward",
  "Intelligence plus character—that is the goal of true education. – Martin Luther King Jr.",
  
  // Success & Achievement
  "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "Success usually comes to those who are too busy to be looking for it. – Henry David Thoreau",
  "Don't be afraid to give up the good to go for the great. – John D. Rockefeller",
  "I find that the harder I work, the more luck I seem to have. – Thomas Jefferson",
  "Success is walking from failure to failure with no loss of enthusiasm. – Winston Churchill",
  "The way to get started is to quit talking and begin doing. – Walt Disney",
  "Don't let yesterday take up too much of today. – Will Rogers",
  "If you are working on something that you really care about, you don't have to be pushed. The vision pulls you. – Steve Jobs",
  "People who are crazy enough to think they can change the world, are the ones who do. – Rob Siltanen",
  
  // Motivation & Inspiration
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "It always seems impossible until it's done. – Nelson Mandela",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "You are never too old to set another goal or to dream a new dream. – C.S. Lewis",
  "Everything you've ever wanted is on the other side of fear. – George Addair",
  "What lies behind us and what lies before us are tiny matters compared to what lies within us. – Ralph Waldo Emerson",
  "Start where you are. Use what you have. Do what you can. – Arthur Ashe",
  "The only impossible journey is the one you never begin. – Tony Robbins",
  "You don't have to be great to start, but you have to start to be great. – Zig Ziglar",
  
  // Perseverance & Growth
  "Strive for progress, not perfection.",
  "Every accomplishment starts with the decision to try.",
  "Fall seven times and stand up eight. – Japanese Proverb",
  "A journey of a thousand miles begins with a single step. – Lao Tzu",
  "The difference between ordinary and extraordinary is that little extra. – Jimmy Johnson",
  "Don't limit your challenges. Challenge your limits.",
  "Success is the sum of small efforts repeated day in and day out. – Robert Collier",
  "The only place where success comes before work is in the dictionary. – Vidal Sassoon",
  "Do not wait to strike till the iron is hot, but make it hot by striking. – William Butler Yeats",
  "The secret of getting ahead is getting started. – Mark Twain",
  
  // Wisdom & Knowledge
  "The only true wisdom is in knowing you know nothing. – Socrates",
  "Knowledge is power. – Francis Bacon",
  "In learning you will teach, and in teaching you will learn. – Phil Collins",
  "The mind is not a vessel to be filled, but a fire to be kindled. – Plutarch",
  "Education is what remains after one has forgotten what one has learned in school. – Albert Einstein",
  "The roots of education are bitter, but the fruit is sweet. – Aristotle",
  "A person who never made a mistake never tried anything new. – Albert Einstein",
  "Wisdom is not a product of schooling but of the lifelong attempt to acquire it. – Albert Einstein",
  "Real knowledge is to know the extent of one's ignorance. – Confucius",
  "The greatest enemy of knowledge is not ignorance, it is the illusion of knowledge. – Stephen Hawking",
  
  // Dreams & Goals
  "All our dreams can come true if we have the courage to pursue them. – Walt Disney",
  "The only limit to our realization of tomorrow will be our doubts of today. – Franklin D. Roosevelt",
  "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart. – Roy T. Bennett",
  "Dream big and dare to fail. – Norman Vaughan",
  "If you can dream it, you can do it. – Walt Disney",
  "A goal without a plan is just a wish. – Antoine de Saint-Exupéry",
  "Set your goals high, and don't stop till you get there. – Bo Jackson",
  "What you get by achieving your goals is not as important as what you become by achieving your goals. – Zig Ziglar",
  "The trouble with not having a goal is that you can spend your life running up and down the field and never score. – Bill Copeland",
  "You are never too old to set another goal or to dream a new dream. – Les Brown",
  
  // Hard Work & Dedication
  "There are no secrets to success. It is the result of preparation, hard work, and learning from failure. – Colin Powell",
  "The only way to achieve the impossible is to believe it is possible. – Charles Kingsleigh",
  "Hard work beats talent when talent doesn't work hard. – Tim Notke",
  "Opportunities don't happen. You create them. – Chris Grosser",
  "I'm a greater believer in luck, and I find the harder I work the more I have of it. – Thomas Jefferson",
  "There is no substitute for hard work. – Thomas Edison",
  "Do the hard jobs first. The easy jobs will take care of themselves. – Dale Carnegie",
  "Without hard work, nothing grows but weeds. – Gordon B. Hinckley",
  "Genius is 1% talent and 99% hard work. – Albert Einstein",
  "Success isn't always about greatness. It's about consistency. – Dwayne Johnson",
  
  // Confidence & Self-Belief
  "Whether you think you can or you think you can't, you're right. – Henry Ford",
  "Believe in yourself. You are braver than you think, more talented than you know, and capable of more than you imagine. – Roy T. Bennett",
  "You yourself, as much as anybody in the entire universe, deserve your love and affection. – Buddha",
  "No one can make you feel inferior without your consent. – Eleanor Roosevelt",
  "With the new day comes new strength and new thoughts. – Eleanor Roosevelt",
  "Always be yourself, express yourself, have faith in yourself. – Bruce Lee",
  "Trust yourself. You know more than you think you do. – Benjamin Spock",
  "Be yourself; everyone else is already taken. – Oscar Wilde",
  "You have within you right now, everything you need to deal with whatever the world can throw at you. – Brian Tracy",
  "Optimism is the faith that leads to achievement. – Helen Keller",
  
  // Change & Growth
  "Change your thoughts and you change your world. – Norman Vincent Peale",
  "The only person you are destined to become is the person you decide to be. – Ralph Waldo Emerson",
  "Growth is painful. Change is painful. But nothing is as painful as staying stuck somewhere you don't belong.",
  "Life is 10% what happens to you and 90% how you react to it. – Charles R. Swindoll",
  "In order to succeed, we must first believe that we can. – Nikos Kazantzakis",
  "Be the change that you wish to see in the world. – Mahatma Gandhi",
  "Yesterday is history, tomorrow is a mystery, today is a gift of God. – Bil Keane",
  "The best time to plant a tree was 20 years ago. The second best time is now. – Chinese Proverb",
  "It does not matter how slowly you go as long as you do not stop. – Confucius",
  "Life is what happens when you're busy making other plans. – John Lennon"
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
