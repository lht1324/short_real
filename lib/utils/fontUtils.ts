enum FontWeight {
    Thin = 100,
    ExtraLight = 200,
    Light = 300,
    Normal = 400,
    Medium = 500,
    SemiBold = 600,
    Bold = 700,
    ExtraBold = 800,
    Black = 900,
}

export function getFontWeightName(fontWeight: FontWeight) {
    switch (fontWeight) {
        case FontWeight.Thin: return 'Thin'
        case FontWeight.ExtraLight: return 'Extra Light'
        case FontWeight.Light: return 'Light'
        case FontWeight.Normal: return 'Normal'
        case FontWeight.Medium: return 'Medium'
        case FontWeight.SemiBold: return 'Semi Bold'
        case FontWeight.Bold: return 'Bold'
        case FontWeight.ExtraBold: return 'Extra Bold'
        case FontWeight.Black: return 'Black'
    }
}