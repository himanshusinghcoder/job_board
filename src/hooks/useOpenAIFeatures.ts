import { useState } from 'react'

export function useOpenAIFeatures() {
  const [isEnabled, setIsEnabled] = useState(() => {
    // Check if OpenAI API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    return !!apiKey
  })

  const [isLoading, setIsLoading] = useState(false)

  return {
    isEnabled,
    setIsEnabled,
    isLoading,
    setIsLoading
  }
}