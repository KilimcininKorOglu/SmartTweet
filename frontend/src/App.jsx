import { useState, useEffect } from 'react'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import './App.css'

// Icon components
const StatusIcon = ({ status }) => {
  switch (status) {
    case 'connected':
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    case 'disconnected':
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    default:
      return null
  }
}

const ChatIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.003 9.003 0 01-5.455-1.838L3 18l1.838-3.545C3.667 13.245 3 11.75 3 10c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
)

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const LoginIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const PostTypeIcons = {
  post: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  poll: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

// Helper function to calculate time remaining until scheduled post
const getTimeRemaining = (scheduledTime) => {
  const now = new Date()
  const scheduled = new Date(scheduledTime)
  const diffMs = scheduled.getTime() - now.getTime()
  
  if (diffMs <= 0) {
    return "Yayınlanması gerekiyor"
  }
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) {
    const remainingHours = diffHours % 24
    return `${diffDays} gün ${remainingHours > 0 ? remainingHours + ' saat' : ''}`
  } else if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60
    return `${diffHours} saat ${remainingMinutes > 0 ? remainingMinutes + ' dakika' : ''}`
  } else {
    return `${diffMinutes} dakika`
  }
}

function App() {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [tools, setTools] = useState([])
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduledTime, setScheduledTime] = useState(new Date(Date.now() + 60000)) // Default: 1 minute from now
  const [scheduledPosts, setScheduledPosts] = useState([])
  const [historyPosts, setHistoryPosts] = useState([])
  const [activeTab, setActiveTab] = useState('chat') // 'chat', 'scheduled', 'history', 'admin', or 'profile'
  const [editingPost, setEditingPost] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editScheduledTime, setEditScheduledTime] = useState(new Date())
  const [editPollOptions, setEditPollOptions] = useState(['', ''])
  const [editPostType, setEditPostType] = useState('post')
  const [previewText, setPreviewText] = useState('')
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem('authToken')
    } catch (error) {
      console.error('localStorage erişim hatası:', error)
      return null
    }
  })
  const [currentUsername, setCurrentUsername] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isUsingPreviewText, setIsUsingPreviewText] = useState(false)
  const [previewData, setPreviewData] = useState(null)

  // Post type selection
  const [selectedPostType, setSelectedPostType] = useState('post') // 'post' or 'poll'

  // Poll options for chat page
  const [chatPollOptions, setChatPollOptions] = useState(['', '', '', ''])

  // Admin states
  const [allUsers, setAllUsers] = useState([])
  const [allPosts, setAllPosts] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)

  // Profile states
  const [profileUsername, setProfileUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // API credentials states
  const [credentials, setCredentials] = useState({
    twitterApiKey: '',
    twitterApiSecret: '',
    twitterAccessToken: '',
    twitterAccessTokenSecret: '',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    contentPrompt: '',
    pollPrompt: ''
  })
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false)

  // Default prompts for placeholder display
  const [defaultPrompts, setDefaultPrompts] = useState({
    contentPrompt: '',
    pollPrompt: ''
  })

  // Admin user creation states
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    role: 'user'
  })
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // State to force re-render for countdown updates
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  // Initialize connection when component mounts
  useEffect(() => {
    // First set axios header if token exists
    let storedToken;
    try {
      storedToken = localStorage.getItem('authToken');
    } catch (error) {
      console.error('localStorage erişim hatası:', error);
      storedToken = null;
    }
    if (storedToken) {
      setAuthToken(storedToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
    }
    checkAuthStatus()
  }, [])

  useEffect(() => {
    if (isAuthenticated && authToken) {
      initializeConnection()
      loadScheduledPosts()
      loadUserCredentials()
      loadDefaultPrompts()
    }
  }, [isAuthenticated, authToken])

  // Set axios default authorization header
  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [authToken])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    const timeoutId = setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)

    // Store timeout ID for potential cleanup
    if (window.toastTimeout) {
      clearTimeout(window.toastTimeout)
    }
    window.toastTimeout = timeoutId
  }

  const checkAuthStatus = async () => {
    let storedToken;
    try {
      storedToken = localStorage.getItem('authToken');
    } catch (error) {
      console.error('localStorage erişim hatası:', error);
      storedToken = null;
    }

    if (storedToken) {
      try {
        const response = await axios.get('http://localhost:3001/api/auth-status', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        })

        if (response.data.authenticated === true) {
          setIsAuthenticated(true)
          setCurrentUsername(response.data.username || '')
          setCurrentUserRole(response.data.role || '')
          setCurrentUserId(response.data.userId || null)
          setProfileUsername(response.data.username || '')
        } else {
          try {
            localStorage.removeItem('authToken');
          } catch (error) {
            console.error('localStorage temizleme hatası:', error);
          }
          setAuthToken(null)
          setCurrentUsername('')
          setCurrentUserRole('')
          setCurrentUserId(null)
          setProfileUsername('')
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth status kontrolü başarısız:', error)
        try {
          localStorage.removeItem('authToken');
        } catch (storageError) {
          console.error('localStorage temizleme hatası:', storageError);
        }
        setAuthToken(null)
        setIsAuthenticated(false)
      }
    } else {
      setIsAuthenticated(false)
    }
  }

  const login = async () => {
    if (!loginUsername || !loginPassword) {
      showToast('Kullanıcı adı ve şifre gerekli', 'error')
      return
    }

    setIsLoggingIn(true)
    try {
      const response = await axios.post('http://localhost:3001/api/login', {
        username: loginUsername,
        password: loginPassword
      })

      if (response.data.success) {
        const token = response.data.token
        setAuthToken(token)
        try {
          localStorage.setItem('authToken', token);
        } catch (error) {
          console.error('localStorage kaydetme hatası:', error);
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        setIsAuthenticated(true)
        setShowLogin(false)
        setLoginUsername('')
        setLoginPassword('')
        showToast('Giriş başarılı!', 'success')
      }
    } catch (error) {
      console.error('Giriş başarısız:', error)
      const message = error.response?.data?.message || 'Giriş başarısız'
      showToast(message, 'error')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const register = async () => {
    if (!registerUsername || !registerPassword) {
      showToast('Kullanıcı adı ve şifre gerekli', 'error')
      return
    }

    if (registerUsername.length < 3) {
      showToast('Kullanıcı adı en az 3 karakter olmalı', 'error')
      return
    }

    if (registerPassword.length < 6) {
      showToast('Şifre en az 6 karakter olmalı', 'error')
      return
    }

    setIsRegistering(true)
    try {
      const response = await axios.post('http://localhost:3001/api/register', {
        username: registerUsername,
        password: registerPassword
      })

      if (response.data.success) {
        showToast('Hesap başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.', 'success')
        setShowRegister(false)
        setRegisterUsername('')
        setRegisterPassword('')
        // Switch to login form
        setShowLogin(true)
      }
    } catch (error) {
      console.error('Kayıt başarısız:', error)
      const message = error.response?.data?.message || 'Kayıt başarısız'
      showToast(message, 'error')
    } finally {
      setIsRegistering(false)
    }
  }

  const logout = async () => {
    try {
      await axios.post('http://localhost:3001/api/logout')
    } catch (error) {
      console.error('Çıkış hatası:', error)
    } finally {
      try {
        localStorage.removeItem('authToken');
      } catch (error) {
        console.error('localStorage temizleme hatası:', error);
      }
      setAuthToken(null)
      setCurrentUsername('')
      setCurrentUserRole('')
      delete axios.defaults.headers.common['Authorization']
      setIsAuthenticated(false)
      setChatHistory([])
      setScheduledPosts([])
      setAllUsers([])
      setAllPosts([])
      showToast('Çıkış yapıldı', 'success')
    }
  }

  const initializeConnection = async () => {
    try {
      // Check if backend is running by trying to connect
      const response = await fetch('http://localhost:3001/sse')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setIsConnected(true)
      // In a real app, you'd establish the SSE connection here
      // For now, we'll simulate having the tools available
      setTools([
        { name: 'createPost', description: 'Create a tweet' },
        { name: 'createPoll', description: 'Create a poll' }
      ])

      // Add welcome message
      setChatHistory([{
        role: 'system',
        message: 'Bağlandı! Artık tweet\'ler ve anketler oluşturabilir, bunları daha sonra için zamanlayabilirsiniz!',
        timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
      }])
    } catch (error) {
      console.error('Failed to connect to backend:', error)
      setChatHistory([{
        role: 'system',
        message: 'Backend\'e bağlanılamadı. Sunucunuzun 3001 portunda çalıştığından emin olun.',
        timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
      }])
    }
  }

  const loadScheduledPosts = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/scheduled-posts')
      if (response.data?.success && Array.isArray(response.data.posts)) {
        setScheduledPosts(response.data.posts)
      } else {
        console.warn('Geçersiz scheduled posts yanıtı:', response.data);
      }
    } catch (error) {
      console.error('Failed to load scheduled posts:', error)
    }
  }

  const loadPostsHistory = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/posts-history')
      if (response.data?.success && Array.isArray(response.data.posts)) {
        setHistoryPosts(response.data.posts)
      } else {
        console.warn('Geçersiz history posts yanıtı:', response.data);
      }
    } catch (error) {
      console.error('Failed to load posts history:', error)
    }
  }

  const loadAllUsers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/admin/users')
      if (response.data?.success && Array.isArray(response.data.users)) {
        setAllUsers(response.data.users)
      } else {
        console.warn('Geçersiz users yanıtı:', response.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }


  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await axios.put(`http://localhost:3001/api/admin/users/${userId}/role`, {
        role: newRole
      })
      if (response.data.success) {
        showToast('Kullanıcı rolü güncellendi', 'success')
        loadAllUsers()
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
      showToast(error.response?.data?.message || 'Rol güncellenemedi', 'error')
    }
  }

  const resetUserPassword = async (userId, username) => {
    const confirmReset = window.confirm(`${username} kullanıcısının şifresini sıfırlamak istediğinizden emin misiniz?`)
    if (!confirmReset) return

    const newPassword = window.prompt(`${username} için yeni şifre girin:`)
    if (!newPassword || newPassword.length < 6) {
      showToast('Şifre en az 6 karakter olmalı', 'error')
      return
    }

    try {
      const response = await axios.put(`http://localhost:3001/api/admin/users/${userId}/password`, {
        newPassword: newPassword
      })
      if (response.data.success) {
        showToast('Kullanıcı şifresi sıfırlandı', 'success')
      }
    } catch (error) {
      console.error('Failed to reset user password:', error)
      showToast(error.response?.data?.message || 'Şifre sıfırlanamadı', 'error')
    }
  }

  const loadDefaultPrompts = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/default-prompts')
      if (response.data?.success && response.data.prompts) {
        setDefaultPrompts(response.data.prompts)
      } else {
        console.warn('Geçersiz default prompts yanıtı:', response.data);
      }
    } catch (error) {
      console.error('Failed to load default prompts:', error)
    }
  }

  const loadUserCredentials = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/profile/credentials')
      if (response.data.success) {
        setCredentials({
          twitterApiKey: response.data.credentials.twitter_api_key || '',
          twitterApiSecret: response.data.credentials.twitter_api_secret || '',
          twitterAccessToken: response.data.credentials.twitter_access_token || '',
          twitterAccessTokenSecret: response.data.credentials.twitter_access_token_secret || '',
          geminiApiKey: response.data.credentials.gemini_api_key || '',
          geminiModel: response.data.credentials.gemini_model || 'gemini-2.5-flash',
          contentPrompt: response.data.credentials.content_enhancement_prompt || '',
          pollPrompt: response.data.credentials.poll_generation_prompt || ''
        })
      }
    } catch (error) {
      console.error('Failed to load user credentials:', error)
    }
  }

  const updateCredentials = async () => {
    setIsUpdatingCredentials(true)
    try {
      const response = await axios.put('http://localhost:3001/api/profile/credentials', credentials)
      if (response.data.success) {
        showToast('API bilgileri güncellendi', 'success')
      }
    } catch (error) {
      console.error('Failed to update credentials:', error)
      showToast(error.response?.data?.message || 'API bilgileri güncellenemedi', 'error')
    } finally {
      setIsUpdatingCredentials(false)
    }
  }

  const createAdminUser = async () => {
    if (!newUserData.username || !newUserData.password) {
      showToast('Kullanıcı adı ve şifre gerekli', 'error')
      return
    }

    if (newUserData.username.length < 3) {
      showToast('Kullanıcı adı en az 3 karakter olmalı', 'error')
      return
    }

    if (newUserData.password.length < 6) {
      showToast('Şifre en az 6 karakter olmalı', 'error')
      return
    }

    setIsCreatingUser(true)
    try {
      const response = await axios.post('http://localhost:3001/api/admin/create-user', newUserData)
      if (response.data.success) {
        showToast('Kullanıcı başarıyla oluşturuldu', 'success')
        setNewUserData({ username: '', password: '', role: 'user' })
        setShowAddUser(false)
        loadAllUsers()
      }
    } catch (error) {
      console.error('Failed to create user:', error)
      showToast(error.response?.data?.message || 'Kullanıcı oluşturulamadı', 'error')
    } finally {
      setIsCreatingUser(false)
    }
  }

  const updateUserUsername = async (userId, currentUsername) => {
    const newUsername = window.prompt(`${currentUsername} için yeni kullanıcı adı girin:`, currentUsername)
    if (!newUsername || newUsername === currentUsername) return

    if (newUsername.length < 3) {
      showToast('Kullanıcı adı en az 3 karakter olmalı', 'error')
      return
    }

    try {
      const response = await axios.put(`http://localhost:3001/api/admin/users/${userId}/username`, {
        username: newUsername
      })
      if (response.data.success) {
        showToast('Kullanıcı adı güncellendi', 'success')
        loadAllUsers()
      }
    } catch (error) {
      console.error('Failed to update username:', error)
      showToast(error.response?.data?.message || 'Kullanıcı adı güncellenemedi', 'error')
    }
  }

  const updateProfile = async () => {
    if (!profileUsername.trim()) {
      showToast('Kullanıcı adı boş olamaz', 'error')
      return
    }

    if (profileUsername.length < 3) {
      showToast('Kullanıcı adı en az 3 karakter olmalı', 'error')
      return
    }

    try {
      const response = await axios.put('http://localhost:3001/api/profile/username', {
        username: profileUsername
      })
      if (response.data.success) {
        setCurrentUsername(profileUsername)
        showToast('Kullanıcı adı güncellendi', 'success')
      }
    } catch (error) {
      console.error('Failed to update username:', error)
      showToast(error.response?.data?.message || 'Kullanıcı adı güncellenemedi', 'error')
    }
  }

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Tüm şifre alanlarını doldurun', 'error')
      return
    }

    if (newPassword.length < 6) {
      showToast('Yeni şifre en az 6 karakter olmalı', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('Yeni şifreler eşleşmiyor', 'error')
      return
    }

    setIsUpdatingPassword(true)
    try {
      const response = await axios.put('http://localhost:3001/api/profile/password', {
        currentPassword,
        newPassword
      })
      if (response.data.success) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        showToast('Şifre başarıyla değiştirildi', 'success')
      }
    } catch (error) {
      console.error('Failed to change password:', error)
      showToast(error.response?.data?.message || 'Şifre değiştirilemedi', 'error')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const sendMessage = async (isScheduled = false) => {
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage('')
    setIsLoading(true)

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      message: isScheduled ? `${userMessage} (scheduled for ${scheduledTime.toLocaleString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })})` : userMessage,
      timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
    }
    setChatHistory(prev => [...prev, newUserMessage])

    try {
      // Use selected post type instead of automatic detection
      const postType = selectedPostType
      const postData = {} // Simple empty data, no automatic detection needed

      let response = ''

      if (isScheduled) {
        // Schedule the post
        response = await schedulePost(postType, userMessage, postData)
      } else {
        // Post immediately
        response = await executePost(postType, userMessage, postData)
      }

      // Add AI response to chat
      const aiResponse = {
        role: 'assistant',
        message: response,
        timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
      }
      setChatHistory(prev => [...prev, aiResponse])

      // Reload scheduled posts if we just scheduled one
      if (isScheduled) {
        await loadScheduledPosts()
      }

    } catch (error) {
      console.error('Error processing message:', error)
      const errorResponse = {
        role: 'assistant',
        message: 'Üzgünüm, isteğinizi işlerken bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
      }
      setChatHistory(prev => [...prev, errorResponse])
    }

    setIsLoading(false)
    setShowScheduler(false)
  }

  // Helper function to determine post type and extract data
  const determinePostTypeAndData = async (userMessage) => {
    const lowerMessage = userMessage.toLowerCase()

    if (lowerMessage.includes('poll') || lowerMessage.includes('vote') ||
      lowerMessage.includes('anket') || lowerMessage.includes('oylama') ||
      lowerMessage.includes('oylar') || lowerMessage.includes('tercih') ||
      lowerMessage.includes('kim olacak') || lowerMessage.includes('hangisi olacak') ||
      lowerMessage.includes('şampiyon') || lowerMessage.includes('kazanacak') ||
      lowerMessage.includes('sizce kim') || lowerMessage.includes('sizce hangi') ||
      lowerMessage.includes('tahmin') && (lowerMessage.includes('kim') || lowerMessage.includes('hangisi'))) {
      return {
        postType: 'poll',
        postData: {
          question: userMessage,
          // Don't provide default options - let the backend extract them
          options: null,
          durationMinutes: 1440
        }
      }
    } else {
      return {
        postType: 'post',
        postData: {
          status: userMessage
        }
      }
    }
  }

  // Schedule a post
  const schedulePost = async (postType, content, postData) => {
    try {
      // Add poll options to metadata if available
      let metadata = postData
      if (postType === 'poll') {
        // Use chat poll options if filled, otherwise use preview options
        const filledChatOptions = chatPollOptions.filter(option => option.trim() !== '')
        if (filledChatOptions.length >= 2) {
          metadata = { ...postData, previewPollOptions: filledChatOptions }
        } else if (isUsingPreviewText && previewData?.pollOptions) {
          metadata = { ...postData, previewPollOptions: previewData.pollOptions }
        }
      }

      const response = await axios.post('http://localhost:3001/api/schedule-post', {
        content,
        postType,
        scheduledTime: scheduledTime.toISOString(),
        metadata,
        enhanceContent: false // No automatic enhancement - user can use preview button
      })

      return `Gönderi başarıyla zamanlandı - ${scheduledTime.toLocaleString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })} için`
    } catch (error) {
      return `Gönderi zamanlanamadı: ${error.response?.data?.message || error.message}`
    }
  }

  // Execute post immediately
  const executePost = async (postType, content, postData) => {
    switch (postType) {
      case 'poll':
        // Use chat poll options if filled, otherwise use preview options
        const filledChatOptions = chatPollOptions.filter(option => option.trim() !== '')
        const pollOptions = filledChatOptions.length >= 2
          ? filledChatOptions
          : (isUsingPreviewText && previewData?.pollOptions) ? previewData.pollOptions : null
        return await handlePollRequest(content, false, pollOptions)
      default:
        return await handleRegularPostRequest(content, false)
    }
  }

  // Cancel a scheduled post
  const cancelScheduledPost = async (postId) => {
    try {
      await axios.delete(`http://localhost:3001/api/scheduled-posts/${postId}`)
      await loadScheduledPosts()

      // Add system message
      setChatHistory(prev => [...prev, {
        role: 'system',
        message: `Zamanlanmış gönderi #${postId} iptal edildi`,
        timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
      }])
    } catch (error) {
      console.error('Failed to cancel post:', error)
    }
  }

  // Permanently delete a scheduled post
  const deleteScheduledPost = async (postId) => {
    try {
      await axios.delete(`http://localhost:3001/api/scheduled-posts/${postId}/permanent`)
      await loadScheduledPosts()

      // Add system message
      setChatHistory(prev => [...prev, {
        role: 'system',
        message: `Zamanlanmış gönderi #${postId} kalıcı olarak silindi`,
        timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
      }])
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  // Open edit modal
  const openEditModal = (post) => {
    setEditingPost(post)
    setEditContent(post.content)
    setEditScheduledTime(new Date(post.scheduled_time))

    // Set post type from post.post_type
    setEditPostType(post.post_type)

    // Extract poll options from metadata
    let pollOptions = ['', '']
    if (post.post_type === 'poll' && post.metadata) {
      try {
        const metadata = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata
        // Try to get poll options from either previewPollOptions or options
        const extractedOptions = metadata.previewPollOptions || metadata.options
        if (extractedOptions && Array.isArray(extractedOptions) && extractedOptions.length > 0) {
          pollOptions = extractedOptions
        }
      } catch (error) {
        console.error('Anket seçenekleri parse edilemedi:', error)
      }
    }
    setEditPollOptions(pollOptions)
  }

  // Close edit modal
  const closeEditModal = () => {
    setEditingPost(null)
    setEditContent('')
    setEditScheduledTime(new Date())
    setEditPollOptions(['', ''])
    setEditPostType('post')
  }

  // Update scheduled post
  const updateScheduledPost = async () => {
    if (!editingPost || !editContent.trim()) return

    try {
      // Prepare metadata with poll options if this is a poll
      let metadata = {}
      if (editingPost.metadata) {
        try {
          metadata = typeof editingPost.metadata === 'string' ? JSON.parse(editingPost.metadata) : editingPost.metadata
        } catch (error) {
          console.error('Mevcut metadata parse edilemedi:', error)
        }
      }

      // If this is a poll, include poll options in metadata
      if (editPostType === 'poll' && editPollOptions.length > 0) {
        metadata.options = editPollOptions.filter(option => option.trim() !== '')
        // Also preserve previewPollOptions if it exists
        if (metadata.previewPollOptions) {
          metadata.previewPollOptions = editPollOptions.filter(option => option.trim() !== '')
        }
      }

      await axios.put(`http://localhost:3001/api/scheduled-posts/${editingPost.id}`, {
        content: editContent,
        scheduledTime: editScheduledTime.toISOString(),
        metadata,
        resetStatus: editingPost.status !== 'pending' // Reset status to pending if not already pending
      })

      await loadScheduledPosts()
      closeEditModal()

      // Add system message
      setChatHistory(prev => [...prev, {
        role: 'system',
        message: `Zamanlanmış gönderi #${editingPost.id} güncellendi`,
        timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
      }])
    } catch (error) {
      console.error('Failed to update post:', error)
      // Add error message
      setChatHistory(prev => [...prev, {
        role: 'system',
        message: `Gönderi güncellenemedi: ${error.response?.data?.message || error.message}`,
        timestamp: new Date().toLocaleTimeString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })
      }])
    }
  }

  // Helper functions to handle different types of requests
  const handleRegularPostRequest = async (message, enhance = true) => {
    try {
      const response = await axios.post('http://localhost:3001/api/createPost', {
        status: message,
        enhanceContent: enhance
      })
      return `Tweet başarıyla paylaşıldı!`
    } catch (error) {
      return `Tweet paylaşılamadı: ${error.response?.data?.message || error.message}`
    }
  }

  const handlePollRequest = async (message, enhance = true, previewOptions = null) => {
    const question = message

    try {
      const response = await axios.post('http://localhost:3001/api/createPoll', {
        question,
        options: previewOptions && previewOptions.length > 0 ? previewOptions : undefined, // Only send if we have actual options
        durationMinutes: 1440,
        enhanceContent: enhance
      })
      return `Anket başarıyla oluşturuldu!`
    } catch (error) {
      return `Anket oluşturulamadı: ${error.response?.data?.message || error.message}`
    }
  }





  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(false)
    }
  }

  // Format post status for display
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-amber-300 bg-amber-900/50 border-amber-800'
      case 'posted': return 'text-green-300 bg-green-900/50 border-green-800'
      case 'failed': return 'text-red-300 bg-red-900/50 border-red-800'
      case 'cancelled': return 'text-gray-300 bg-gray-800/50 border-gray-600'
      default: return 'text-gray-300 bg-gray-800/50 border-gray-600'
    }
  }

  const formatPostType = (postType) => {
    const types = {
      'post': 'Tweet',
      'poll': 'Anket'
    }
    return types[postType] || postType
  }

  // Generate AI preview
  const generatePreview = async () => {
    if (!message.trim() || isGeneratingPreview) return

    setIsGeneratingPreview(true)

    try {
      const response = await axios.post('http://localhost:3001/api/enhance-preview', {
        content: message.trim(),
        postType: selectedPostType
      })

      if (response.data.success) {
        setPreviewText(response.data.enhancedContent)
        setPreviewData({
          isPoll: selectedPostType === 'poll',
          pollOptions: response.data.pollOptions || null
        })
      } else {
        setPreviewText('Önizleme oluşturulamadı')
        setPreviewData(null)
      }
    } catch (error) {
      console.error('Preview generation failed:', error)
      setPreviewText('Önizleme oluşturulamadı: ' + (error.response?.data?.message || error.message))
      setPreviewData(null)
    }

    setIsGeneratingPreview(false)
  }

  // Login/Register screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <TwitterIcon className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <h1 className="text-2xl font-bold text-white mb-2">SmartTweet</h1>
            <p className="text-gray-400">Akıllı Tweet Zamanlayıcı</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setShowRegister(false)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${!showRegister
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
                }`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${showRegister
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
                }`}
            >
              Kayıt Ol
            </button>
          </div>

          {!showRegister ? (
            /* Login Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kullanıcı adınızı girin"
                  onKeyPress={(e) => e.key === 'Enter' && login()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Şifrenizi girin"
                  onKeyPress={(e) => e.key === 'Enter' && login()}
                />
              </div>

              <button
                onClick={login}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LoginIcon />
                )}
                {isLoggingIn ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </div>
          ) : (
            /* Register Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kullanıcı adınızı girin (en az 3 karakter)"
                  onKeyPress={(e) => e.key === 'Enter' && register()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Şifrenizi girin (en az 6 karakter)"
                  onKeyPress={(e) => e.key === 'Enter' && register()}
                />
              </div>

              <button
                onClick={register}
                disabled={isRegistering}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isRegistering ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LoginIcon />
                )}
                {isRegistering ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
              </button>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast.show && (
          <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-medium z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
            }`}>
            {toast.message}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <TwitterIcon />
            <h1 className="text-2xl font-bold text-white">Zamanlanmış Tweetler</h1>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isConnected ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
                <StatusIcon status={isConnected ? 'connected' : 'disconnected'} />
                <span className="text-sm font-medium">
                  {isConnected ? 'Sunucuya bağlı' : 'Bağlantı kesildi'}
                </span>
              </div>
            </div>

            {/* Tab Navigation and Auth */}
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'chat'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  <ChatIcon />
                  Sohbet
                </button>
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'scheduled'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  <CalendarIcon />
                  Zamanlanmış ({scheduledPosts.filter(p => p.status === 'pending').length})
                </button>
                <button
                  onClick={() => {setActiveTab('history'); loadPostsHistory()}}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Geçmiş ({historyPosts.filter(p => p.status === 'posted').length})
                </button>
                {currentUserRole === 'admin' && (
                  <button
                    onClick={() => {
                      setActiveTab('admin')
                      loadAllUsers()
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'admin'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.865" />
                    </svg>
                    Yönetim
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'profile'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {currentUsername}
                </button>
              </div>

              {/* Auth Info */}
              <div className="flex items-center gap-4">
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <LogoutIcon />
                  Çıkış
                </button>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'profile' ? (
          /* Profile Settings */
          <div className="space-y-6">
            {/* Profile Information */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h2 className="font-semibold text-white">Profil Ayarları</h2>
              </div>
              <div className="p-6 space-y-6">
                {/* User Info Display */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {currentUsername?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{currentUsername}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${currentUserRole === 'admin'
                            ? 'bg-red-900/50 text-red-400 border border-red-800'
                            : 'bg-blue-900/50 text-blue-400 border border-blue-800'
                          }`}>
                          {currentUserRole?.toUpperCase() || 'USER'}
                        </span>
                        <span className="text-sm text-gray-400">Hesap ID: {currentUserId}</span>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Password Change */}
                <div>
                  <h3 className="font-medium text-white mb-4">Şifre Değiştir</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Mevcut Şifre
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mevcut şifrenizi girin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Yeni Şifre
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Yeni şifrenizi girin (en az 6 karakter)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Yeni Şifre Tekrar
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Yeni şifrenizi tekrar girin"
                      />
                    </div>
                    <button
                      onClick={changePassword}
                      disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isUpdatingPassword ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2L4.257 10.257a6 6 0 115.486-5.486L15 9.5M15 7l-3-3M9 11l-2 2" />
                        </svg>
                      )}
                      {isUpdatingPassword ? 'Güncelleniyor...' : 'Şifreyi Değiştir'}
                    </button>
                  </div>
                </div>

                {/* API Credentials Management */}
                <div>
                  <h3 className="font-medium text-white mb-4">API Ayarları</h3>
                  <div className="space-y-4">
                    {/* Twitter API Credentials */}
                    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                      <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                        <TwitterIcon />
                        Twitter API Bilgileri
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="API Key"
                          value={credentials.twitterApiKey}
                          onChange={(e) => setCredentials({ ...credentials, twitterApiKey: e.target.value })}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="password"
                          placeholder="API Secret"
                          value={credentials.twitterApiSecret}
                          onChange={(e) => setCredentials({ ...credentials, twitterApiSecret: e.target.value })}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Access Token"
                          value={credentials.twitterAccessToken}
                          onChange={(e) => setCredentials({ ...credentials, twitterAccessToken: e.target.value })}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="password"
                          placeholder="Access Token Secret"
                          value={credentials.twitterAccessTokenSecret}
                          onChange={(e) => setCredentials({ ...credentials, twitterAccessTokenSecret: e.target.value })}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Gemini AI Credentials */}
                    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                      <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        Gemini AI Ayarları
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="password"
                          placeholder="Gemini API Key"
                          value={credentials.geminiApiKey}
                          onChange={(e) => setCredentials({ ...credentials, geminiApiKey: e.target.value })}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <input
                          type="text"
                          placeholder="Model adı (örn: gemini-2.5-flash)"
                          value={credentials.geminiModel}
                          onChange={(e) => setCredentials({ ...credentials, geminiModel: e.target.value })}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* AI Prompts Management */}
                    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                      <h4 className="text-sm font-medium text-emerald-300 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Prompt Ayarları
                      </h4>
                      <p className="text-xs text-gray-400 mb-4">
                        AI'ya gönderilen promptları özelleştirin. Boş bırakırsanız varsayılan promptlar kullanılır.
                      </p>

                      <div className="space-y-4">
                        {/* Content Enhancement Prompt */}
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">
                            İçerik Geliştirme Promtu
                          </label>
                          <textarea
                            placeholder="Tweet'leri geliştirmek için kullanılacak prompt... (boş bırakırsanız varsayılan kullanılır)"
                            value={credentials.contentPrompt || defaultPrompts.contentPrompt}
                            onChange={(e) => setCredentials({ ...credentials, contentPrompt: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-24 resize-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {"{content}"} kullanarak tweet içeriğini ekleyebilirsiniz
                          </p>
                        </div>

                        {/* Poll Generation Prompt */}
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">
                            Anket Seçeneği Oluşturma Promtu
                          </label>
                          <textarea
                            placeholder="Anket seçenekleri oluşturmak için kullanılacak prompt... (boş bırakırsanız varsayılan kullanılır)"
                            value={credentials.pollPrompt || defaultPrompts.pollPrompt}
                            onChange={(e) => setCredentials({ ...credentials, pollPrompt: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-32 resize-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {"{question}"} kullanarak anket sorusunu ekleyebilirsiniz
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={updateCredentials}
                      disabled={isUpdatingCredentials}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isUpdatingCredentials ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {isUpdatingCredentials ? 'Güncelleniyor...' : 'API Bilgilerini Kaydet'}
                    </button>
                  </div>
                </div>

                {/* Account Statistics */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-3">Hesap İstatistikleri</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-blue-400 font-medium">Toplam Gönderi</div>
                      <div className="text-2xl font-bold text-white mt-1">{scheduledPosts.length}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-green-400 font-medium">Başarılı Gönderiler</div>
                      <div className="text-2xl font-bold text-white mt-1">{scheduledPosts.filter(p => p.status === 'posted').length}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-amber-400 font-medium">Bekleyen Gönderiler</div>
                      <div className="text-2xl font-bold text-white mt-1">{scheduledPosts.filter(p => p.status === 'pending').length}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-red-400 font-medium">Başarısız Gönderiler</div>
                      <div className="text-2xl font-bold text-white mt-1">{scheduledPosts.filter(p => p.status === 'failed').length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'admin' ? (
          /* Admin Panel */
          <div className="space-y-6">
            {/* Users Management */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <h2 className="font-semibold text-white">Kullanıcı Yönetimi</h2>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Kullanıcı Ekle
                </button>
              </div>
              <div className="p-6">
                {allUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>Kullanıcı listesi yükleniyor...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border border-gray-600 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                            {user.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-white">{user.username}</div>
                            <div className="text-sm text-gray-400">
                              {new Date(user.created_at).toLocaleString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <select
                              onChange={(e) => updateUserRole(user.id, e.target.value)}
                              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              defaultValue={user.role}
                              disabled={user.id === currentUserId}
                            >
                              <option value="user">USER</option>
                              <option value="admin">ADMIN</option>
                            </select>
                            <button
                              onClick={() => updateUserUsername(user.id, user.username)}
                              disabled={user.id === currentUserId}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                            >
                              İsim Değiştir
                            </button>
                            <button
                              onClick={() => resetUserPassword(user.id, user.username)}
                              disabled={user.id === currentUserId}
                              className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                            >
                              Şifre Sıfırla
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : activeTab === 'history' ? (
          /* Posts History Tab */
          <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="font-semibold text-white">Geçmiş Gönderiler</h2>
              <button
                onClick={loadPostsHistory}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshIcon />
                Yenile
              </button>
            </div>
            <div className="p-6">
              {historyPosts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2">Henüz gönderi geçmişi yok.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyPosts.map((post) => (
                    <div key={post.id} className="border border-gray-600 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 font-medium text-gray-200">
                          {PostTypeIcons[post.post_type] && PostTypeIcons[post.post_type]()}
                          {formatPostType(post.post_type)}
                        </div>
                      </div>

                      <p className="text-gray-200 mb-3">{post.content}</p>

                      {/* Poll options display */}
                      {post.post_type === 'poll' && (post.metadata?.previewPollOptions || post.metadata?.options) && (
                        <div className="text-sm text-blue-300 mb-3 bg-gray-700/50 rounded-lg p-3 border-l-4 border-blue-500">
                          <div className="flex items-center gap-2 font-medium mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Anket Şıkları:
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {(post.metadata.previewPollOptions || post.metadata.options).map((option, index) => (
                              <span key={index} className="text-xs bg-blue-900/30 text-blue-200 px-3 py-1 rounded-full border border-blue-700">
                                {index + 1}. {option}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-sm text-gray-400 space-y-1">
                        <p className="text-green-400 font-medium flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Paylaşıldı: {new Date(post.posted_at).toLocaleString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })}
                        </p>
                        <p className="text-gray-400">Oluşturuldu: {new Date(post.created_at).toLocaleString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'chat' ? (
          <>
            {/* Chat History */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 mb-6">
              <div className="p-4 border-b border-gray-700">
                <h2 className="font-semibold text-white">Sohbet Geçmişi</h2>
              </div>
              <div className="max-h-96 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((chat, index) => (
                  <div key={index} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${chat.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : chat.role === 'system'
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-800'
                        : 'bg-gray-700 text-gray-200'
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">{chat.message}</p>
                      <p className="text-xs mt-1 opacity-70">{chat.timestamp}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg">
                      <p className="text-sm">İşleniyor...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
              {showScheduler && (
                <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-800">
                  <h3 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
                    <ClockIcon />
                    Gönderiyi Zamanla
                  </h3>
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-blue-300 font-medium">Zamanla:</label>
                    <DatePicker
                      selected={scheduledTime}
                      onChange={setScheduledTime}
                      showTimeSelect
                      dateFormat="Pp"
                      minDate={new Date()}
                      className="p-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => setShowScheduler(false)}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                    >
                      <CloseIcon />
                      İptal
                    </button>
                  </div>
                </div>
              )}

              {/* Post Type Selection */}
              <div className="mb-4">
                <div className="flex items-center gap-6 justify-center">
                  <span className="text-sm font-medium text-gray-300">Gönderi Türü:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="postType"
                      checked={selectedPostType === 'post'}
                      onChange={() => setSelectedPostType('post')}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex items-center gap-2">
                      <PostTypeIcons.post />
                      <span className="text-gray-200 font-medium">Tweet</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="postType"
                      checked={selectedPostType === 'poll'}
                      onChange={() => setSelectedPostType('poll')}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex items-center gap-2">
                      <PostTypeIcons.poll />
                      <span className="text-gray-200 font-medium">Anket</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value)
                      setIsUsingPreviewText(false) // Reset flag when user types
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Mesajınızı buraya yazın... (örn: 'En iyi programlama dili hakkında anket oluştur' veya 'AI hakkında tweet paylaş')"
                    className="w-full p-4 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    disabled={isLoading || !isConnected}
                  />

                  {/* Poll options input boxes */}
                  {selectedPostType === 'poll' && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm text-gray-300 font-medium">Anket Seçenekleri:</div>
                      {chatPollOptions.map((option, index) => (
                        <input
                          key={index}
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...chatPollOptions]
                            newOptions[index] = e.target.value.substring(0, 25) // Twitter limit
                            setChatPollOptions(newOptions)
                          }}
                          placeholder={`Seçenek ${index + 1}${index < 2 ? ' (gerekli)' : ' (opsiyonel)'}`}
                          className="w-full p-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          maxLength={25}
                        />
                      ))}
                      <div className="text-xs text-gray-400">
                        En az 2, en fazla 4 seçenek girebilirsiniz. Her seçenek maksimum 25 karakter olabilir.
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => sendMessage(false)}
                    disabled={isLoading || !isConnected || !message.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <SendIcon />
                    {isLoading ? 'Gönderiliyor...' : 'Şimdi Paylaş'}
                  </button>
                  <button
                    onClick={() => showScheduler ? sendMessage(true) : setShowScheduler(true)}
                    disabled={isLoading || !isConnected || !message.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <ClockIcon />
                    {showScheduler ? 'Zamanla' : 'Zamanla'}
                  </button>
                  <button
                    onClick={generatePreview}
                    disabled={isGeneratingPreview || !isConnected || !message.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <EyeIcon />
                    {isGeneratingPreview ? 'Oluşturuluyor...' : 'AI Önizleme'}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Preview Section */}
            {previewText && (
              <div className="mt-6 bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <EyeIcon />
                    AI Önizlemesi
                  </h3>
                  <button
                    onClick={() => {
                      setPreviewText('')
                      setPreviewData(null)
                    }}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {previewData?.isPoll ? 'Anket Sorusu:' : 'Gönderi İçeriği:'}
                    </h4>
                    <p className="text-gray-200 whitespace-pre-wrap">{previewText}</p>
                  </div>

                  {previewData?.isPoll && previewData?.pollOptions && (
                    <div className="border-t border-gray-600 pt-3">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Anket Seçenekleri:</h4>
                      <div className="space-y-2">
                        {previewData.pollOptions.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-200 text-sm">{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setMessage(previewText)
                      setIsUsingPreviewText(true)

                      // Auto-fill chat poll options if this is a poll
                      if (previewData?.isPoll && previewData?.pollOptions) {
                        const newOptions = ['', '', '', '']
                        previewData.pollOptions.forEach((option, index) => {
                          if (index < 4) newOptions[index] = option
                        })
                        setChatPollOptions(newOptions)
                      }

                      setPreviewText('')
                      setPreviewData(null)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Kullan
                  </button>
                  <button
                    onClick={generatePreview}
                    disabled={isGeneratingPreview}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <RefreshIcon />
                    Yeniden Oluştur
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
              <h3 className="font-semibold text-white mb-4">Öneriler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <button
                  onClick={() => setMessage("En iyi programlama dili hakkında anket oluştur")}
                  className="text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors border border-gray-600"
                >
                  <div className="flex items-center gap-2 font-medium text-gray-200 mb-1">
                    <PostTypeIcons.poll />
                    Programlama dilleri hakkında anket oluştur
                  </div>
                  <p className="text-gray-400 text-xs">İlgili seçenekleri otomatik olarak çıkararak anket oluşturur</p>
                </button>
                <button
                  onClick={() => setMessage("AI hakkında tweet paylaş")}
                  className="text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors border border-gray-600"
                >
                  <div className="flex items-center gap-2 font-medium text-gray-200 mb-1">
                    <PostTypeIcons.post />
                    AI hakkında tweet paylaş
                  </div>
                  <p className="text-gray-400 text-xs">Basit bir metin tweeti oluşturur</p>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Scheduled Posts Tab */
          <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="font-semibold text-white">Zamanlanmış Gönderiler</h2>
              <button
                onClick={loadScheduledPosts}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshIcon />
                Yenile
              </button>
            </div>
            <div className="p-6">
              {scheduledPosts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CalendarIcon />
                  <p className="mt-2">Henüz zamanlanmış gönderi yok. Sohbet kullanarak bir tane oluşturun!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledPosts.map((post) => (
                    <div key={post.id} className="border border-gray-600 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 font-medium text-gray-200">
                            {PostTypeIcons[post.post_type] && PostTypeIcons[post.post_type]()}
                            {formatPostType(post.post_type)}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(post.status)}`}>
                            {post.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {post.status === 'pending' && (
                            <button
                              onClick={() => cancelScheduledPost(post.id)}
                              className="flex items-center gap-1 text-amber-500 hover:text-amber-700 text-sm font-medium"
                            >
                              <CloseIcon />
                              İptal Et
                            </button>
                          )}
                          
                          {/* Edit button for all statuses */}
                          <button
                            onClick={() => openEditModal(post)}
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm font-medium"
                          >
                            <EditIcon />
                            {post.status === 'posted' ? 'Yeniden Yayınla' : post.status === 'failed' ? 'Tekrar Dene' : 'Düzenle'}
                          </button>
                          
                          {/* Delete button for all statuses */}
                          <button
                            onClick={() => deleteScheduledPost(post.id)}
                            className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            <TrashIcon />
                            Sil
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-200 mb-3">{post.content}</p>

                      {/* Poll options display */}
                      {post.post_type === 'poll' && (post.metadata?.previewPollOptions || post.metadata?.options) && (
                        <div className="text-sm text-blue-300 mb-3 bg-gray-700/50 rounded-lg p-3 border-l-4 border-blue-500">
                          <div className="flex items-center gap-2 font-medium mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Anket Şıkları:
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {(post.metadata.previewPollOptions || post.metadata.options).map((option, index) => (
                              <span key={index} className="text-xs bg-blue-900/30 text-blue-200 px-3 py-1 rounded-full border border-blue-700">
                                {index + 1}. {option}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-sm text-gray-400 space-y-1">
                        <p className="flex items-center gap-2">
                          <ClockIcon />
                          Zamanlandı: {new Date(post.scheduled_time).toLocaleString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })}
                        </p>
                        {post.status === 'pending' && (
                          <p className="text-orange-400 font-medium">
                            ⏱️ Yayınlanmaya Kalan Süre: {getTimeRemaining(post.scheduled_time)}
                          </p>
                        )}
                        <p className="text-gray-400">Oluşturuldu: {new Date(post.created_at).toLocaleString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })}</p>
                        {post.posted_at && (
                          <p className="text-green-400">Paylaşıldı: {new Date(post.posted_at).toLocaleString(import.meta.env.VITE_LOCALE || 'tr-TR', { timeZone: import.meta.env.VITE_TIMEZONE || 'Europe/Istanbul' })}</p>
                        )}
                        {post.error_message && (
                          <p className="text-red-400">Hata: {post.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl mx-4 border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Zamanlanmış Gönderiyi Düzenle</h3>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  İçerik
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Gönderi içeriğinizi girin..."
                />
              </div>

              {/* Poll options editing for poll posts */}
              {editPostType === 'poll' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Anket Seçenekleri
                  </label>
                  <div className="space-y-2">
                    {editPollOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...editPollOptions]
                            newOptions[index] = e.target.value
                            setEditPollOptions(newOptions)
                          }}
                          placeholder={`Seçenek ${index + 1}`}
                          className="flex-1 p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {editPollOptions.length > 2 && (
                          <button
                            onClick={() => {
                              const newOptions = editPollOptions.filter((_, i) => i !== index)
                              setEditPollOptions(newOptions)
                            }}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    ))}
                    {editPollOptions.length < 4 && (
                      <button
                        onClick={() => setEditPollOptions([...editPollOptions, ''])}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        + Seçenek Ekle
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Zamanlanmış Saat
                </label>
                <DatePicker
                  selected={editScheduledTime}
                  onChange={setEditScheduledTime}
                  showTimeSelect
                  dateFormat="Pp"
                  minDate={new Date()}
                  className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={updateScheduledPost}
                disabled={!editContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Gönderiyi Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4 border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Yeni Kullanıcı Ekle</h3>
                <button
                  onClick={() => {
                    setShowAddUser(false)
                    setNewUserData({ username: '', password: '', role: 'user' })
                  }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kullanıcı adı (en az 3 karakter)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Şifre (en az 6 karakter)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rol
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddUser(false)
                  setNewUserData({ username: '', password: '', role: 'user' })
                }}
                className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={createAdminUser}
                disabled={isCreatingUser || !newUserData.username.trim() || !newUserData.password.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isCreatingUser ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
                {isCreatingUser ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-medium z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App