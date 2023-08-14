jQuery(document).ready(function ($) {
    var $body = $('body');

    $('.toggler').on('click', function () {
        $body.toggleClass('hide-menu');
        if ($body.hasClass("hide-menu")) {
            setCookie('hideNav', 'true');
        } else {
            setCookie('hideNav', 'false');
        }
    })

    $('.menu-toggle').on('click', function (e) {
        $body.toggleClass('hide-menu');
        if ($body.hasClass("hide-menu")) {
            setCookie('hideNav', 'true');
        } else {
            setCookie('hideNav', 'false');
        }
        e.preventDefault()
        e.stopPropagation()
    })

    $('.close-menu').on('click', function (e) {
        $body.toggleClass('hide-menu');
        if ($body.hasClass("hide-menu")) {
            setCookie('hideNav', 'true');
        } else {
            setCookie('hideNav', 'false');
        }
        e.preventDefault()
        e.stopPropagation()
    })

    
    $('#sidebar').on('click', '.nav-expander', function (e) {
        e.preventDefault()
        e.stopPropagation()
        var $navItem = $(this).parents('.nav-item')
        $navItem.toggleClass('expanded')
    })

    $('#sidebar').on('click', '.nav-employee a', function (e) {
        console.log(e.isPropagationStopped())
        if(e.isPropagationStopped()) return false
        $body.addClass('hide-menu');
        setCookie('hideNav', 'true');
    })

    $('[data-toggle="tooltip"]').tooltip()
    
});

