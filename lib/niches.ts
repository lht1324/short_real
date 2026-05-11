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
            id: 'history',
            label: 'Historical Secrets',
            icon: '🏛️'
        },
        generationParams: {
            systemRole: "You are a historical investigator specializing in hidden mysteries and human drama.",
            topicDiscoveryPrompt: "Identify a mysterious historical event or person from the 18th or 19th century that remains unexplained. Focus on the human choices and secrets involved.",
            scriptInstruction: "Maintain a suspenseful, slightly eerie tone. Use present tense to make it immersive. Describe the people and their expressions vividly.",
            negativeConstraints: "Do not use modern-day political comparisons. Avoid dry academic facts or landscape-only descriptions."
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
            topicDiscoveryPrompt: "Find a chilling folklore or real-life unexplained creepy phenomenon involving a person's encounter.",
            scriptInstruction: "Write a 30-second terrifying script. Use vivid, unsettling descriptions of characters and a twist ending.",
            negativeConstraints: "Avoid excessive gore, rely on psychological horror and character-driven suspense."
        }
    },
    {
        uiMetadata: {
            id: 'motivation',
            label: 'Daily Motivation',
            icon: '💪'
        },
        generationParams: {
            systemRole: "You are a top-tier motivational speaker and life coach.",
            topicDiscoveryPrompt: "Identify a powerful psychological principle or historical story of a person overcoming immense odds.",
            scriptInstruction: "Write an energetic, fast-paced 30-second script that inspires immediate action through human struggle and triumph.",
            negativeConstraints: "Avoid cliché quotes, focus on actionable and intense reality checks involving real human effort."
        }
    },
    {
        uiMetadata: {
            id: 'wealth',
            label: 'Business Legends',
            icon: '💰'
        },
        generationParams: {
            systemRole: "You are a business strategist and biographer.",
            topicDiscoveryPrompt: "Explain a hidden mechanic of wealth building or a historical financial masterstroke by a legendary figure.",
            scriptInstruction: "Deliver a crisp, authoritative 30-second script. Focus on the genius and decision-making of the person involved.",
            negativeConstraints: "Never give direct financial advice. Avoid generic money facts; focus on the person's story."
        }
    },
    {
        uiMetadata: {
            id: 'philosophy',
            label: 'Life Philosophy',
            icon: '🧠'
        },
        generationParams: {
            systemRole: "You are a modern philosopher translating deep concepts for the digital age.",
            topicDiscoveryPrompt: "Choose a profound philosophical paradox or stoic principle that directly applies to a person's daily life.",
            scriptInstruction: "Write a thought-provoking 30-second script. End with a question that leaves the viewer contemplating their own character and life.",
            negativeConstraints: "Avoid overly dense academic jargon. Focus on the internal world of a person."
        }
    },
    {
        uiMetadata: {
            id: 'psychology',
            label: 'Dark Psychology',
            icon: '👁️'
        },
        generationParams: {
            systemRole: "You are a master of behavioral psychology and human observation.",
            topicDiscoveryPrompt: "Identify a powerful psychological trick or dark manipulation tactic used in social interactions.",
            scriptInstruction: "Write a 30-second high-tension script. Describe the subtle body language and psychological effects on people involved.",
            negativeConstraints: "Avoid clinical medical terms. Focus on the visceral and social reality of the tactic."
        }
    },
    {
        uiMetadata: {
            id: 'crime',
            label: 'True Crime',
            icon: '🕵️'
        },
        generationParams: {
            systemRole: "You are a criminal investigator and cold case specialist.",
            topicDiscoveryPrompt: "Find a mysterious historical heist or an unsolved criminal mastermind story.",
            scriptInstruction: "Maintain a fast-paced, high-stakes narrative. Focus on the motives and clever maneuvers of the people involved.",
            negativeConstraints: "Avoid gratuitous violence. Focus on the intellectual and psychological aspects of the crime."
        }
    }
];
