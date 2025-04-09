import { atom, useAtom, useSetAtom } from "jotai";
import { createContext, useContext } from "react";

type PopUpComponent<P = void> = (props: P) => React.JSX.Element;
type PopUp<P = void> = {
  component: PopUpComponent<P>;
  props: P;
};

const popUpsAtom = atom<Set<PopUp<any>>>(new Set<PopUp<any>>());
const PopUpContext = createContext({
  close: () => { throw new Error('Popup is not enclosed in CurrentPopUp (No PopUpContext)!'); return; }
});
export const useClosePopUp = () => {
  const ctx = useContext(PopUpContext);
  return ctx.close;
}

const useCurrentPopUps = () => useAtom(popUpsAtom);
export const useAddPopUp = () => {
  const setState = useSetAtom(popUpsAtom);
  return <P extends object>(component: PopUpComponent<P>, props?: P) => {
    setState((prevState) => {
      const newState = new Set(prevState);
      newState.add({ component, props });
      return newState;
    });
  }
}

export function CurrentPopUp() {
  const [popUps, setPopUps] = useCurrentPopUps();

  const close = () => {
    if (popUps.size <= 0)
      return;
    const newQueue = new Set<PopUp<any>>(popUps);
    newQueue.delete(newQueue.values().next().value!);
    setPopUps(newQueue);
  };

  if (popUps.size == 0)
    return null;

  const { component: CurrentPopUp, props } = popUps.values().next().value as PopUp<any>;

  return <PopUpContext.Provider value={{ close }}>
    <CurrentPopUp {...props} />
  </PopUpContext.Provider>
}

export function PopUp({children, title}: {children: React.ReactNode, title?: string}) {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        {title && 
          <h1 className="popup-title">
            {title}
          </h1>
        }
        {children}
      </div>
    </div>
  );
}