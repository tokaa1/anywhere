import { useClosePopUp, PopUp } from '@renderer/lib/popup';
import StyledButton from './StyledButton';

interface PopUpImageProps {
  src: string;
  name: string;
}

export const PopUpImage = ({ src, name }: PopUpImageProps): JSX.Element => {
  const close = useClosePopUp();

  return (
    <PopUp title={name}>
      <div className="popup-image-container">
        <img 
          src={src} 
          alt={name} 
          className="popup-image"
        />
        <div className="popup-controls">
          <StyledButton onClick={close}>Close</StyledButton>
        </div>
      </div>
    </PopUp>
  );
}; 