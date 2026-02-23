import {useEffect, useState, memo} from "react";

function TypeWriter({ text }: { text: string }) {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        setDisplayedText("");
        let i = 0;
        const speed = Math.max(30, 2000 / text.length);
        const timer = setInterval(() => {
            if (i <= text.length) {
                setDisplayedText(text.slice(0, i + 1));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text]);

    return <span>{displayedText}</span>;
}

export default memo(TypeWriter);