import { PopUp, useClosePopUp } from "@renderer/lib/popup";
import StyledButton from "./StyledButton";

export function PopUpRawMessage({message}: {message: string}) {
  const closePopUp = useClosePopUp();
  return <PopUp title={'Viewing raw output'}>
    <StyledButton onClick={closePopUp}>
      {'Close'}
    </StyledButton>
    <div className="raw-msg-popup-content">
      {message}
    </div>
  </PopUp>
}