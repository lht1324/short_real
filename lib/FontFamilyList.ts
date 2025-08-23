import {FontVariant} from "@/api/types/google-fonts/GoogleFont";

export interface FontFamily {
    name: string;
    generic: string;
    weightList: FontVariant[];
}

const FONT_FAMILY_LIST: FontFamily[] = [
    {
        name: "Crimson Text",
        generic: "serif",
        weightList: [
            { weight: 400, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true }
        ]
    },
    {
        name: "Fira Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Inter",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Lato",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Merriweather",
        generic: "serif",
        weightList: [
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Montserrat",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Nunito",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Open Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true }
        ]
    },
    {
        name: "Oswald",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: false },
            { weight: 300, isItalicSupported: false },
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false }
        ]
    },
    {
        name: "Playfair Display",
        generic: "serif",
        weightList: [
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Poppins",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Raleway",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Roboto",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Source Sans 3",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Work Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    }
];

export default FONT_FAMILY_LIST;