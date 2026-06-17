import { useEffect, useState } from "react";

const LG_MIN_WIDTH = "(min-width: 1024px)";

/**
 * lg ブレークポイント（1024px）以上かどうかを返します。
 *
 * SSR 時は false を返し、クライアントで同期します。
 *
 * @returns lg 以上なら true
 */
export const useIsLgUp = (): boolean => {
  const [isLgUp, setIsLgUp] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(LG_MIN_WIDTH);
    const handleChange = () => {
      setIsLgUp(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isLgUp;
};
