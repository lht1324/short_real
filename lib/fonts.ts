import { 
    Inter, 
    Montserrat, 
    Roboto, 
    Open_Sans, 
    Lato,
    Poppins,
    Nunito,
    Work_Sans,
    Source_Sans_3,
    Raleway,
    Oswald,
    Merriweather,
    Playfair_Display,
    Crimson_Text,
    Fira_Sans
} from 'next/font/google'

export const inter = Inter({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const montserrat = Montserrat({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const roboto = Roboto({
    subsets: ['latin'],
    weight: ['100', '300', '400', '500', '700', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const openSans = Open_Sans({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700', '800'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const lato = Lato({
    subsets: ['latin'],
    weight: ['100', '300', '400', '700', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const poppins = Poppins({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const nunito = Nunito({
    subsets: ['latin'],
    weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const workSans = Work_Sans({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const sourceSans3 = Source_Sans_3({
    subsets: ['latin'],
    weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const raleway = Raleway({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const oswald = Oswald({
    subsets: ['latin'],
    weight: ['200', '300', '400', '500', '600', '700'],
    style: ['normal'],
    display: 'swap',
})

export const merriweather = Merriweather({
    subsets: ['latin'],
    weight: ['300', '400', '700', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const playfairDisplay = Playfair_Display({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const crimsonText = Crimson_Text({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const firaSans = Fira_Sans({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

// 폰트 매핑 객체
export const fontMap = {
    'Crimson Text': crimsonText,
    'Fira Sans': firaSans,
    'Inter': inter,
    'Lato': lato,
    'Merriweather': merriweather,
    'Montserrat': montserrat,
    'Nunito': nunito,
    'Open Sans': openSans,
    'Oswald': oswald,
    'Playfair Display': playfairDisplay,
    'Poppins': poppins,
    'Raleway': raleway,
    'Roboto': roboto,
    'Source Sans 3': sourceSans3,
    'Work Sans': workSans,
} as const

export type FontName = keyof typeof fontMap