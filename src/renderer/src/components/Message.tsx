import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import StyledButton from './StyledButton';
import { useAddPopUp } from '@renderer/lib/popup';
import { PopUpRawMessage } from './PopUpRawMessage';
import { PopUpImage } from './PopUpImage';

interface ImageAttachment {
  id: string;
  data: Uint8Array;
  preview: string;
  name: string;
}

interface MessageProps {
  content: string;
  isUser: boolean;
  model?: string;
  images?: ImageAttachment[];
  onRetry?: () => void;
}

function Message({ content, isUser, model, images, onRetry }: MessageProps) {
  const addPopUp = useAddPopUp();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImageClick = (image: ImageAttachment) => {
    addPopUp(PopUpImage, { src: image.preview, name: image.name });
  };

  // Clean the message content by removing the "[X image(s) attached]" text
  const cleanContent = (content: string) => {
    return content.replace(/\s*\[\d+ images? attached\]\s*$/, '');
  };

  const components: Components = {
    code({ node, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !className;
      const isJSX = match && match[1] == 'jsx';

      if (!isInline && match) {
        const codeText = String(children).replace(/\n$/, '');
        return (
          <div className="code-block">
            <div className="code-language">
              {match[1]}
            </div>
            <SyntaxHighlighter
              language={match[1]}
              style={vscDarkPlus as any}
              customStyle={{}}
              wrapLines={true}
              wrapLongLines={false}
              showLineNumbers={true}
              useInlineStyles={true}
              codeTagProps={{
                className: "code-tag"
              }}
              className="syntax-highlighter-wrapper"
            >
              {codeText}
            </SyntaxHighlighter>
            <div className="code-block-actions">
              <StyledButton onClick={() => handleCopy(codeText)} className="small">
                {isCopied ? 'Copied!' : 'Copy'}
              </StyledButton>
            </div>
          </div>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      {isUser ? (
        <div>
          {cleanContent(content)}

          {images && images.length > 0 && (
            <div className="attached-images">
              {images.map(img => (
                <div key={img.id} className="image-preview-container">
                  <img
                    src={img.preview}
                    alt={img.name}
                    className="image-preview"
                    onClick={() => handleImageClick(img)}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="message-actions">
            <StyledButton onClick={() => handleCopy(cleanContent(content))} className="small">
              {isCopied ? 'Copied!' : 'Copy'}
            </StyledButton>
          </div>
        </div>
      ) : (
        <>
          {model && (
            <div className="message-model">
              {model}
            </div>
          )}
          <ReactMarkdown components={components}>
            {content}
          </ReactMarkdown>
          <div className="message-actions">
            <StyledButton onClick={() => { addPopUp(PopUpRawMessage, { message: content }) }} className="small">
              View Raw
            </StyledButton>
            <StyledButton onClick={() => handleCopy(content)} className="small styled-button-margin-left">
              {isCopied ? 'Copied!' : 'Copy'}
            </StyledButton>
            {onRetry && (
              <StyledButton onClick={onRetry} className="small styled-button-margin-left">
                Regenerate
              </StyledButton>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Message; 