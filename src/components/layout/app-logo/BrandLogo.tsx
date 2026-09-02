type TSocialLink = {
    name: string;
    href: string;
    icon: string;
};

type TBrandLogoProps = {
    className?: string;
};

const socialLinks: TSocialLink[] = [
    {
        name: 'Telegram',
        href: 'https://t.me/your-channel',
        icon: '/assets/images/telegram.png',
    },
    {
        name: 'Whatsapp',
        href: 'https://wa.me/your-number',
        icon: '/assets/images/whatsapp.png',
    },
    {
        name: 'Tiktok',
        href: 'https://www.tiktok.com/@your-handle',
        icon: '/assets/images/tiktok.png',
    },
];

export const BrandLogo = ({ className = '' }: TBrandLogoProps) => {
    return (
        <ul
            className={className}
            style={{
                display: 'flex',
                gap: '12px',
                listStyle: 'none',
                padding: 0,
                margin: 0,
            }}
        >
            {socialLinks.map(social => (
                <li key={social.name}>
                    <a href={social.href} target='_blank' rel='noopener noreferrer' aria-label={social.name}>
                        <img
                            src={social.icon}
                            alt={social.name}
                            style={{
                                display: 'block',
                                width: '24px',
                                height: '24px',
                            }}
                        />
                    </a>
                </li>
            ))}
        </ul>
    );
};
