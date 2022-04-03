const subjects = {
    'expiry_reminder': {
        'en': '[influ.ai] Your authorization token is about to expire',
        'es': '[influ.ai] Su token de autorización está a punto de caducar',
        'bg': '[influ.ai] Вашият токен за оторизация е на път да изтече '
    },
    'forgot_password': {
        'en': '[influ.ai] Reset your password',
        'es': '[influ.ai] Restablecer su contraseña',
        'bg': '[influ.ai] Промяна на паролата'
    },
    'influencer_accepted': {
        'en': `[influ.ai] {{ name }} accepted invitation for "{{ campaign }}" campaign`,
        'es': `[influ.ai] {{ name }} aceptó la invitación para la campaña "{{ campaign }}"`,
        'bg': `[influ.ai] {{ name }} прие покана за кампания "{{ campaign }}".`
    },
    'influencer_declined': {
        'en': `[influ.ai] {{ name }} declined invitation for "{{ campaign }}" campaign`,
        'es': `[influ.ai] {{ name }} rechazó la invitación para la campaña "{{ campaign }}"`,
        'bg': `[influ.ai] {{ name }} отхвърли покана за кампания „{{ campaign }}“.`
    },
    'invite_influencer': {
        'en': `[influ.ai] You have been invited to join "{{ campaign }}" campaign`,
        'es': `[influ.ai] Ha sido invitado a unirse a la campaña "{{ campaign }}"`,
        'bg': `[influ.ai] Бяхте поканени да се присъедините към кампанията „{{ campaign }}“.`
    },
    'new_message_influencer': {
        'en': `[influ.ai] New message about {{ campaign }} campaign`,
        'es': `[influ.ai] Nuevo mensaje sobre la campaña {{ campaign }}`,
        'bg': `[influ.ai] Ново съобщение за кампанията {{ campaign }}`
    },
    'new_message_manager': {
        'en': `[influ.ai] New message about {{ campaign }} campaign`,
        'es': `[influ.ai] Nuevo mensaje sobre la campaña {{ campaign }}`,
        'bg': `[influ.ai] Ново съобщение за кампанията {{ campaign }}`
    }
}

module.exports = subjects;
