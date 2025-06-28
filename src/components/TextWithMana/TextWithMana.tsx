// src/components/TextWithMana/TextWithMana.tsx
import React from 'react';
import {
    WhiteManaIcon, BlueManaIcon, BlackManaIcon, RedManaIcon, GreenManaIcon, ColorlessManaIcon,
    ZeroGenericManaIcon, OneGenericManaIcon, TwoGenericManaIcon, ThreeGenericManaIcon, FourGenericManaIcon, FiveGenericManaIcon,
    SixGenericManaIcon, SevenGenericManaIcon, EightGenericManaIcon, NineGenericManaIcon, TenGenericManaIcon, ElevenGenericManaIcon,
    TwelveGenericManaIcon, ThirteenGenericManaIcon, FourteenGenericManaIcon, FifteenGenericManaIcon, SixteenGenericManaIcon,
    SeventeenGenericManaIcon, EighteenGenericManaIcon, NineteenGenericManaIcon, TwentyGenericManaIcon, XGenericManaIcon,
    WhitePhyrexianManaIcon, BluePhyrexianManaIcon, BlackPhyrexianManaIcon, RedPhyrexianManaIcon, GreenPhyrexianManaIcon,
    TwoGenericWhiteManaSplitIcon, TwoGenericBlueManaSplitIcon, TwoGenericBlackManaSplitIcon, TwoGenericRedManaSplitIcon,
    TwoGenericGreenManaSplitIcon, WhiteBlueManaIcon, WhiteBlackManaIcon, BlueBlackManaIcon, BlueRedManaIcon, BlackRedManaIcon,
    BlackGreenManaIcon, RedGreenManaIcon, GreenWhiteManaIcon, GreenBlueManaIcon, SnowManaIcon, TapIcon
} from '../Icons/icons';
import './TextWithMana.css';

const symbolToIcon: { [key: string]: React.FC<any> } = {
    'W': WhiteManaIcon,
    'U': BlueManaIcon,
    'B': BlackManaIcon,
    'R': RedManaIcon,
    'G': GreenManaIcon,
    'C': ColorlessManaIcon,
    '0': ZeroGenericManaIcon,
    '1': OneGenericManaIcon,
    '2': TwoGenericManaIcon,
    '3': ThreeGenericManaIcon,
    '4': FourGenericManaIcon,
    '5': FiveGenericManaIcon,
    '6': SixGenericManaIcon,
    '7': SevenGenericManaIcon,
    '8': EightGenericManaIcon,
    '9': NineGenericManaIcon,
    '10': TenGenericManaIcon,
    '11': ElevenGenericManaIcon,
    '12': TwelveGenericManaIcon,
    '13': ThirteenGenericManaIcon,
    '14': FourteenGenericManaIcon,
    '15': FifteenGenericManaIcon,
    '16': SixteenGenericManaIcon,
    '17': SeventeenGenericManaIcon,
    '18': EighteenGenericManaIcon,
    '19': NineteenGenericManaIcon,
    '20': TwentyGenericManaIcon,
    'X': XGenericManaIcon,
    'W/P': WhitePhyrexianManaIcon,
    'U/P': BluePhyrexianManaIcon,
    'B/P': BlackPhyrexianManaIcon,
    'R/P': RedPhyrexianManaIcon,
    'G/P': GreenPhyrexianManaIcon,
    '2/W': TwoGenericWhiteManaSplitIcon,
    '2/U': TwoGenericBlueManaSplitIcon,
    '2/B': TwoGenericBlackManaSplitIcon,
    '2/R': TwoGenericRedManaSplitIcon,
    '2/G': TwoGenericGreenManaSplitIcon,
    'W/U': WhiteBlueManaIcon,
    'W/B': WhiteBlackManaIcon,
    'U/B': BlueBlackManaIcon,
    'U/R': BlueRedManaIcon,
    'B/R': BlackRedManaIcon,
    'B/G': BlackGreenManaIcon,
    'R/G': RedGreenManaIcon,
    'G/W': GreenWhiteManaIcon,
    'G/U': GreenBlueManaIcon,
    'T': TapIcon,
    'S': SnowManaIcon,
};

export const TextWithMana: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/({[^{}]+})/g).filter(part => part);

    const elements = parts.map((part, index) => {
        if (part.startsWith('{') && part.endsWith('}')) {
            const symbol = part.slice(1, -1);
            const IconComponent = symbolToIcon[symbol.toUpperCase()];
            if (IconComponent) {
                return <IconComponent key={index} className="mana-icon-inline" />;
            }
        }
        return <span key={index}>{part}</span>;
    });

    return <>{elements}</>;
};