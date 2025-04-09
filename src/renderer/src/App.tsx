import { useEffect, useState, useRef, useCallback } from 'react'
import Message from './components/Message';
import StyledButton from './components/StyledButton';
import { Ollama } from 'ollama';
import { PopUp, useAddPopUp } from './lib/popup';
import { PopUpImage } from './components/PopUpImage';
import SettingsPopup from './components/SettingsPopup';

// Theme configuration
interface ThemeConfig {
  name: string;
  cssClass: string;
}

const themes: ThemeConfig[] = [
  { name: 'Default', cssClass: '' },
  { name: 'Light', cssClass: 'theme-light' },
  { name: 'Vibrant Purple', cssClass: 'theme-vibrant-1' },
  { name: 'Vibrant Teal', cssClass: 'theme-vibrant-2' }
];

interface Message {
  content: string;
  isUser: boolean;
  model?: string;
}

interface ImageAttachment {
  id: string;
  data: Uint8Array;
  preview: string;
  name: string;
}

interface Chat {
  id: string;
  name: string;
  messages: Message[];
  context: number[];
}

export function App(): JSX.Element {
  const [typedPrompt, setTypedPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>(themes[0].name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptAreaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [ollama] = useState(() => new Ollama());
  const [context, setContext] = useState<number[]>([]);
  const addPopUp = useAddPopUp();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Chat state
  const [chats, setChats] = useState<Chat[]>([
    { id: '1', name: 'New Chat', messages: [], context: [] }
  ]);
  const [currentChatId, setCurrentChatId] = useState<string>('1');
  
  // Sidebar resize state
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Apply theme
  useEffect(() => {
    // Get all CSS classes
    const allThemeClasses = themes
      .filter(theme => theme.cssClass)
      .map(theme => theme.cssClass);
    
    // Remove any existing theme classes
    document.body.classList.remove(...allThemeClasses);
    
    // Find the current theme config
    const themeConfig = themes.find(t => t.name === currentTheme);
    
    // Add the CSS class if it exists
    if (themeConfig && themeConfig.cssClass) {
      document.body.classList.add(themeConfig.cssClass);
    }
  }, [currentTheme]);

  // Initialize messages from current chat
  useEffect(() => {
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (currentChat) {
      setMessages(currentChat.messages);
      setContext(currentChat.context);
    }
  }, [currentChatId, chats]);

  // Theme switching function
  const switchTheme = (themeName: string) => {
    setCurrentTheme(themeName);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkIfAtBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      setIsAtBottom(isBottom);
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkIfAtBottom);
      return () => container.removeEventListener('scroll', checkIfAtBottom);
    }
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, streamingResponse, isAtBottom]);

  useEffect(() => {
    // Fetch available models from Ollama
    const fetchModels = async () => {
      try {
        const response = await ollama.list();
        const modelNames = response.models.map((model: any) => model.name);
        setModels(modelNames);
        // Set the first model as default if available
        if (modelNames.length > 0) {
          setSelectedModel(modelNames[0]);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
      }
    };

    fetchModels();
  }, [ollama]);

  const handleImageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        const arrayBuffer = event.target.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const imageId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        
        // Create a preview URL for displaying the image
        const blob = new Blob([uint8Array], { type: file.type });
        const previewUrl = URL.createObjectURL(blob);
        
        setAttachedImages(prev => [
          ...prev, 
          { 
            id: imageId, 
            data: uint8Array, 
            preview: previewUrl,
            name: file.name
          }
        ]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Setup paste event handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              handleImageFile(file);
              e.preventDefault(); // Prevent default paste behavior for images
            }
          }
        }
      }
    };

    const textArea = promptAreaRef.current;
    if (textArea) {
      textArea.addEventListener('paste', handlePaste);
      return () => textArea.removeEventListener('paste', handlePaste);
    } else {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [handleImageFile]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          handleImageFile(files[i]);
        }
      }
    }
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  interface MessageWithImages extends Message {
    images?: ImageAttachment[];
  }
  
  // Create a new chat
  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      name: `New Chat ${chats.length + 1}`,
      messages: [],
      context: []
    };
    
    setChats(prev => [...prev, newChat]);
    setCurrentChatId(newChatId);
  };
  
  // Switch to a different chat
  const switchChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleTextAreaKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!typedPrompt.trim() && attachedImages.length === 0) 
        return;
      if (selectedModel == null || selectedModel == 'None')
        return;

      setIsLoading(true);
      setStreamingResponse('');
      const userMessage = typedPrompt;
      setTypedPrompt('');
      
      // Create a message with attached image info if any
      let messageContent = userMessage;
      if (attachedImages.length > 0) {
        messageContent += attachedImages.length === 1 
          ? ' [1 image attached]' 
          : ` [${attachedImages.length} images attached]`;
      }
      
      const streamingModel = selectedModel as string;
      const newUserMessage = { 
        model: streamingModel,
        content: messageContent, 
        isUser: true,
        images: attachedImages.length > 0 ? [...attachedImages] : undefined 
      };
      
      // Update messages in UI
      setMessages(prev => [...prev, newUserMessage]);
      
      // Update the chat's messages
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, newUserMessage] }
          : chat
      ));

      try {
        // Create a new AbortController for this request
        abortControllerRef.current = new AbortController();
        let shouldContinue = true;

        // Convert images to base64 strings for Ollama API
        const images = attachedImages.map(img => {
          // Convert Uint8Array to base64 string
          const binary = Array.from(img.data)
            .map(byte => String.fromCharCode(byte))
            .join('');
          return btoa(binary);
        });

        const stream = await ollama.generate({
          model: selectedModel as string,
          prompt: userMessage,
          stream: true,
          context: context,
          images: attachedImages.length > 0 ? images : undefined
        });

        let fullResponse = '';
        let lastContext: number[] = [];
        
        // Setup an abort listener
        abortControllerRef.current.signal.addEventListener('abort', () => {
          shouldContinue = false;
        });
        
        // Process the stream
        for await (const chunk of stream) {
          // Check if we should stop processing
          if (!shouldContinue) {
            break;
          }
          
          fullResponse += chunk.response;
          if (chunk.context) {
            lastContext = chunk.context;
          }
          setStreamingResponse(fullResponse);
        }
        
        const newAssistantMessage = { model: streamingModel, content: fullResponse + (shouldContinue ? "" : " [stopped]"), isUser: false };
        
        // Only add the final message if we weren't aborted
        setMessages(prev => [...prev, newAssistantMessage]);
        
        // Update the context
        setContext(lastContext);
        
        // Update the chat's messages and context
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { 
                ...chat, 
                messages: [...chat.messages, newAssistantMessage],
                context: lastContext
              }
            : chat
        ));
        
        setStreamingResponse('');
        
        // Clear attachments after sending
        setAttachedImages([]);
      } catch (error) {
        console.error('Error calling Ollama:', error);
        // Add the error message
        const errorMessage = { model: streamingModel, content: 'Error: Could not get response from Ollama', isUser: false };
        setMessages(prev => [...prev, errorMessage]);
        
        // Update the chat's messages
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...chat.messages, errorMessage] }
            : chat
        ));
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleImageClick = (image: ImageAttachment) => {
    addPopUp(PopUpImage, { src: image.preview, name: image.name });
  };

  // Function to retry a previous user message
  const handleRetry = async (userMessageIndex: number, assistantMessageIndex: number) => {
    if (selectedModel == null || selectedModel === 'None' || userMessageIndex < 0 || !messages[userMessageIndex].isUser) {
      return;
    }

    const userMessage = messages[userMessageIndex];
    setIsLoading(true);
    setStreamingResponse('');
    
    // Get the original message content without the image attachment text
    const originalContent = userMessage.content.replace(/\s*\[\d+ images? attached\]\s*$/, '');
    
    // Get any images from the original message
    const messageImages = (userMessage as MessageWithImages).images || [];
    setAttachedImages(messageImages); // Set attached images for the retry

    try {
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
      let shouldContinue = true;

      // Convert images to base64 strings for Ollama API
      const images = messageImages.map(img => {
        const binary = Array.from(img.data)
          .map(byte => String.fromCharCode(byte))
          .join('');
        return btoa(binary);
      });

      const streamingModel = selectedModel as string;
      
      // Remove both the previous user message and assistant message, then add the user message again
      const newMessages = [...messages];
      
      // Handle indices carefully when removing items
      if (assistantMessageIndex > userMessageIndex) {
        if (assistantMessageIndex >= 0 && assistantMessageIndex < newMessages.length) {
          newMessages.splice(assistantMessageIndex, 1);
        }
        if (userMessageIndex >= 0 && userMessageIndex < newMessages.length) {
          newMessages.splice(userMessageIndex, 1);
        }
      } else {
        if (userMessageIndex >= 0 && userMessageIndex < newMessages.length) {
          newMessages.splice(userMessageIndex, 1);
        }
        if (assistantMessageIndex >= 0 && assistantMessageIndex < newMessages.length) {
          newMessages.splice(assistantMessageIndex, 1);
        }
      }
      
      // Add the user message again
      const updatedUserMessage = { 
        model: streamingModel,
        content: userMessage.content, 
        isUser: true,
        images: messageImages.length > 0 ? [...messageImages] : undefined 
      };
      
      newMessages.push(updatedUserMessage);
      setMessages(newMessages);
      
      // Update the chat
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: newMessages }
          : chat
      ));

      const stream = await ollama.generate({
        model: selectedModel as string,
        prompt: originalContent,
        stream: true,
        context: context,
        images: messageImages.length > 0 ? images : undefined
      });

      let fullResponse = '';
      let lastContext: number[] = [];
      
      // Setup an abort listener
      abortControllerRef.current.signal.addEventListener('abort', () => {
        shouldContinue = false;
      });
      
      // Process the stream
      for await (const chunk of stream) {
        // Check if we should stop processing
        if (!shouldContinue) {
          break;
        }
        
        fullResponse += chunk.response;
        if (chunk.context) {
          lastContext = chunk.context;
        }
        setStreamingResponse(fullResponse);
      }
      
      const newAssistantMessage = { 
        model: streamingModel, 
        content: fullResponse + (shouldContinue ? "" : " [stopped]"), 
        isUser: false 
      };
      
      // Update messages in UI
      setMessages(prev => [...prev, newAssistantMessage]);
      
      // Update context
      setContext(lastContext);
      
      // Update the chat
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages: [...newMessages, newAssistantMessage],
              context: lastContext
            }
          : chat
      ));
      
      setStreamingResponse('');
      
      // Clear attachments after sending
      setAttachedImages([]);
    } catch (error) {
      console.error('Error calling Ollama:', error);
      // Add the error message
      const errorMessage = { model: selectedModel as string, content: 'Error: Could not get response from Ollama', isUser: false };
      setMessages(prev => [...prev, errorMessage]);
      
      // Update the chat's messages
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const openSettings = () => {
    addPopUp(SettingsPopup, { 
      themes,
      currentTheme, 
      onThemeChange: switchTheme 
    });
  };

  // Handle sidebar resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Don't use state here as it might not update immediately
    const startWidth = sidebarRef.current?.offsetWidth || 200;
    const startPositionX = e.clientX;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startPositionX);
      
      // Apply min/max constraints
      if (newWidth >= 120 && newWidth <= 400 && sidebarRef.current) {
        sidebarRef.current.style.width = `${newWidth}px`;
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // Set resizing state after defining handlers
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="app-background">
      <div className="app-content">
        <div 
          ref={sidebarRef}
          className={`sidebar ${isResizing ? 'resizing' : ''}`}
        >
          <StyledButton onClick={createNewChat} className="new-chat-btn">
            + New Chat
          </StyledButton>
          <div className="chat-list">
            {chats.map(chat => (
              <div 
                key={chat.id} 
                className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                onClick={() => switchChat(chat.id)}
              >
                {chat.name}
              </div>
            ))}
          </div>
          <div 
            className="sidebar-resize-handle"
            onMouseDown={handleMouseDown}
          />
        </div>
        
        <div className="main-content">
          <div 
            ref={messagesContainerRef}
            className="messages-container"
          >
            {messages.map((message, index) => {
              // Find the user message that this assistant message is responding to
              const prevUserMessageIndex = message.isUser ? -1 : 
                messages.slice(0, index)
                  .map((msg, i) => ({ msg, i }))
                  .reverse()
                  .find(item => item.msg.isUser)?.i ?? -1;
              
              return (
                <Message 
                  model={message.model} 
                  key={index} 
                  content={message.content} 
                  isUser={message.isUser} 
                  images={(message as MessageWithImages).images}
                  onRetry={!message.isUser ? () => handleRetry(prevUserMessageIndex, index) : undefined}
                />
              );
            })}
            {streamingResponse && (
              <Message model={selectedModel as string} content={streamingResponse} isUser={false} images={undefined} />
            )}
            {isLoading && !streamingResponse && (
              <></>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {attachedImages.length > 0 && (
            <div className="attached-images">
              {attachedImages.map(img => (
                <div key={img.id} className="image-preview-container">
                  <img 
                    src={img.preview} 
                    alt="Attached" 
                    className="image-preview" 
                    onClick={() => handleImageClick(img)}
                    style={{ cursor: 'pointer' }}
                  />
                  <button 
                    className="remove-image-btn" 
                    onClick={() => removeImage(img.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="prompt-container">
            <div className="prompt-controls">
              <div className="model-selector-container">
                <span className="model-label">Model:</span>
                <select
                  className="model-selector"
                  value={selectedModel || ''}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {models.length === 0 && <option value="">No models found</option>}
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
              <StyledButton onClick={handleFileSelect} className="small">
                + Image
              </StyledButton>

              <div className="spacer" />

              <StyledButton onClick={openSettings} className="small" style={{ marginLeft: '10px' }}>
                Settings
              </StyledButton>

              {isLoading && (
                <StyledButton onClick={stopGeneration} className="small stop-btn">
                  Stop
                </StyledButton>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="file-input-hidden"
              />
            </div>
          </div>
          <textarea
            ref={promptAreaRef}
            className="prompt-textarea textarea-auto-height"
            id='prompt-box'
            placeholder='Ask anything!'
            value={typedPrompt}
            onChange={e => setTypedPrompt(e.target.value)}
            onKeyDown={handleTextAreaKeyDown}
          />
        </div>
      </div>
    </div>
  );
}