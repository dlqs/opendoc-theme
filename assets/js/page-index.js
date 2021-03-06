---
---
(function() {
    // Data Blob
    // =============================================================================
    // The main "blob" of site data constructed by liquid
    // We cherry pick to minimize size
    // Also because jsonify doesn't work quite right and collapses the page objects
    // into just strings when we jsonify the whole site
    var pages = [
        {% for site_page in site.html_pages %}
            {% unless site_page.exclude %}
            {% capture name %}{{ site_page.name }}{% endcapture %}
            {% if site_page.title == null %}
            {% capture title %}{% assign words  = name | remove_first: '.md' | split: '-' %}{% for word in words %}{{ word | capitalize }} {% endfor %}{% endcapture %}
            {% else %}
            {% capture title %}{{ site_page.title }}{% endcapture %}
            {% endif %}
            {
                'name': {{name | jsonify}},
                'title': {{title | jsonify}},
                {% if site_page.url == page.url %}
                'content': {{ site_page.content | jsonify }},
                {% else %}
                'content': {{ site_page.content | markdownify | jsonify }},
                {% endif %}
                'url': {{ site_page.url | relative_url | jsonify }}
            },
            {% endunless %}
        {% endfor %}
    ]

    var pageIndex = {}

    pages.forEach(function(page) {
        return pageIndex[page.url] = page
    })

    // Expose as global var
    root = typeof exports !== 'undefined' && exports !== null ? exports : this

    root.pageIndex = pageIndex;
})()