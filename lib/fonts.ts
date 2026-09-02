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
    Fira_Sans,
    Barlow,
    Barlow_Condensed,
    Fjalla_One,
    Pathway_Gothic_One,
    PT_Sans,
    PT_Sans_Narrow,
    Titillium_Web,
    League_Gothic,
    League_Spartan,
    Russo_One
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

export const barlow = Barlow({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const fjallaOne = Fjalla_One({
    subsets: ['latin'],
    weight: ['400'],
    style: ['normal'],
    display: 'swap',
})

export const pathwayGothicOne = Pathway_Gothic_One({
    subsets: ['latin'],
    weight: ['400'],
    style: ['normal'],
    display: 'swap',
})

export const ptSans = PT_Sans({
    subsets: ['latin'],
    weight: ['400', '700'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const ptSansNarrow = PT_Sans_Narrow({
    subsets: ['latin'],
    weight: ['400', '700'],
    style: ['normal'],
    display: 'swap',
})

export const titilliumWeb = Titillium_Web({
    subsets: ['latin'],
    weight: ['200', '300', '400', '600', '700', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

export const leagueGothic = League_Gothic({
    subsets: ['latin'],
    weight: ['400'],
    style: ['normal'],
    display: 'swap',
})

export const leagueSpartan = League_Spartan({
    subsets: ['latin'],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal'],
    display: 'swap',
})

export const russoOne = Russo_One({
    subsets: ['latin'],
    weight: ['400'],
    style: ['normal'],
    display: 'swap',
})

// 폰트 매핑 객체 — 광고 헤드라인용 30~40개 큐레이션 (Barlow 계열, Fjalla One 등 추가)
export const fontMap = {
    'Barlow': barlow,
    'Barlow Condensed': barlowCondensed,
    'Crimson Text': crimsonText,
    'Fira Sans': firaSans,
    'Fjalla One': fjallaOne,
    'Inter': inter,
    'Lato': lato,
    'League Gothic': leagueGothic,
    'League Spartan': leagueSpartan,
    'Merriweather': merriweather,
    'Montserrat': montserrat,
    'Nunito': nunito,
    'Open Sans': openSans,
    'Oswald': oswald,
    'Pathway Gothic One': pathwayGothicOne,
    'Playfair Display': playfairDisplay,
    'Poppins': poppins,
    'PT Sans': ptSans,
    'PT Sans Narrow': ptSansNarrow,
    'Raleway': raleway,
    'Roboto': roboto,
    'Russo One': russoOne,
    'Source Sans 3': sourceSans3,
    'Titillium Web': titilliumWeb,
    'Work Sans': workSans,
} as const

export type FontName = keyof typeof fontMap