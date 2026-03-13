export interface NicheData {
    uiMetadata: {
        id: string;
        label: string;
        icon: string;
    };
    generationParams: {
        systemRole: string;
        topicDiscoveryPrompt: string;
        scriptInstruction: string;
        negativeConstraints: string;
    };
}

export const NICHE_DATA_LIST: NicheData[] = [
    {
        uiMetadata: {
            id: 'space',
            label: 'Space Facts',
            icon: '🚀'
        },
        generationParams: {
            systemRole: "You are a world-class space documentary scriptwriter.",
            topicDiscoveryPrompt: "Find an obscure but verified scientific fact about space that would shock a general audience.",
            scriptInstruction: "Write a 30-second high-tension script. Start with a hook that challenges a common misconception.",
            negativeConstraints: "Never mention sci-fi movies, focus only on real science. Avoid jargon."
        }
    },
    {
        uiMetadata: {
            id: 'history',
            label: 'History Mystery',
            icon: '🏛️'
        },
        generationParams: {
            systemRole: "You are a historical investigator specializing in hidden mysteries.",
            topicDiscoveryPrompt: "Identify a mysterious historical event or person from the 18th or 19th century that remains unexplained.",
            scriptInstruction: "Maintain a suspenseful, slightly eerie tone. Use present tense to make it immersive.",
            negativeConstraints: "Do not use modern-day political comparisons. Avoid dry academic facts."
        }
    },
    {
        uiMetadata: {
            id: 'horror',
            label: 'Scary Stories',
            icon: '👻'
        },
        generationParams: {
            systemRole: "You are a master of horror storytelling and urban legends.",
            topicDiscoveryPrompt: "Find a chilling folklore or real-life unexplained creepy phenomenon.",
            scriptInstruction: "Write a 30-second terrifying script. Use vivid, unsettling descriptions and a twist ending.",
            negativeConstraints: "Avoid excessive gore, rely on psychological horror and suspense."
        }
    },
    {
        uiMetadata: {
            id: 'motivation',
            label: 'Motivation',
            icon: '💪'
        },
        generationParams: {
            systemRole: "You are a top-tier motivational speaker and life coach.",
            topicDiscoveryPrompt: "Identify a powerful psychological principle or historical story of overcoming immense odds.",
            scriptInstruction: "Write an energetic, fast-paced 30-second script that inspires immediate action.",
            negativeConstraints: "Avoid cliché quotes, focus on actionable and intense reality checks."
        }
    },
    {
        uiMetadata: {
            id: 'wealth',
            label: 'Wealth & Money',
            icon: '💰'
        },
        generationParams: {
            systemRole: "You are a financial analyst and business strategist.",
            topicDiscoveryPrompt: "Explain a hidden mechanic of wealth building, a historical financial masterstroke, or a psychological money trap.",
            scriptInstruction: "Deliver a crisp, authoritative 30-second script. Make the viewer feel they are learning an insider secret.",
            negativeConstraints: "Never give direct financial advice or promote crypto/scams."
        }
    },
    {
        uiMetadata: {
            id: 'philosophy',
            label: 'Philosophy',
            icon: '🧠'
        },
        generationParams: {
            systemRole: "You are a modern philosopher translating deep concepts for the digital age.",
            topicDiscoveryPrompt: "Choose a profound philosophical paradox or stoic principle.",
            scriptInstruction: "Write a thought-provoking 30-second script. End with a question that leaves the viewer contemplating their own life.",
            negativeConstraints: "Avoid overly dense academic jargon, keep it relatable to daily life."
        }
    },
    {
        uiMetadata: {
            id: 'nature',
            label: 'Nature/Wild',
            icon: '🌿'
        },
        generationParams: {
            systemRole: "You are a wildlife documentary narrator.",
            topicDiscoveryPrompt: "Find a bizarre or terrifying animal survival adaptation.",
            scriptInstruction: "Write a dramatic 30-second script highlighting the brutal or fascinating reality of nature.",
            negativeConstraints: "Avoid humanizing the animals too much; stick to raw, fascinating biological facts."
        }
    },
    {
        uiMetadata: {
            id: 'science',
            label: 'Cool Science',
            icon: '🧪'
        },
        generationParams: {
            systemRole: "You are an enthusiastic science communicator.",
            topicDiscoveryPrompt: "Explain a mind-bending physics concept or a weird chemical reaction.",
            scriptInstruction: "Write an upbeat, fast-paced 30-second script that makes complex science feel like magic.",
            negativeConstraints: "Don't get bogged down in math; focus on the visual and conceptual wonder."
        }
    }
];