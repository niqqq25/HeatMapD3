(async function ready() {
    const data = await fetchData();
    loadDescription(data);
    loadHeatMap(data);
})();

async function fetchData() {
    const response = await fetch(
        "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json"
    );
    const json = await response.json();

    if (response.ok) {
        return json;
    } else {
        console.error(json);
    }
}

function loadDescription({ baseTemperature, monthlyVariance }) {
    const years = monthlyVariance.map(d => d.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    d3.select("#description").text(
        `${minYear} - ${maxYear}: base temperature ${baseTemperature}℃`
    );
}

const margin = { top: 20, right: 20, bottom: 20, left: 70 };
const height = 400 - margin.top - margin.bottom;
const width = 800 - margin.right - margin.left;
const colors = ["#62A1DB", "#E7D87D", "#DD9F40", "#B4451F", "#B01111"];
const legendWidth = 300;
const legendHeight = 20;

const svg = d3
    .select("#heat-map")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.top)
    .style("overflow", "visible")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const legend = d3
    .select("#heat-map")
    .append("svg")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("overflow", "visible")
    .attr("id", "legend")
    .style("margin", `10px 0 0 ${margin.left}px`);

const tooltip = d3
    .select("#heat-map")
    .append("pre")
    .attr("id", "tooltip")
    .attr("class", "tooltip--hidden");

function loadHeatMap({ baseTemperature, monthlyVariance }) {
    const months = [...new Set(monthlyVariance.map(d => d.month - 1))];
    const years = [...new Set(monthlyVariance.map(d => d.year))];
    const variance = monthlyVariance.map(d => d.variance);
    const minTemp = baseTemperature + Math.min(...variance);
    const maxTemp = baseTemperature + Math.max(...variance);

    const yScale = d3
        .scaleLinear()
        .domain([-0.5, 11.5])
        .range([0, height]);

    const xScale = d3
        .scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);

    const legendTicks = (() => {
        const tickCount = colors.length - 1;
        const arr = [];

        for (let i = 1; i < tickCount + 1; i++) {
            const tick = ((maxTemp - minTemp) / tickCount) * i;
            arr.push(tick);
        }

        return arr;
    })();

    const legendThreshold = d3
        .scaleThreshold()
        .domain(legendTicks)
        .range(colors);

    svg.selectAll("rect")
        .data(monthlyVariance)
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("height", height / months.length)
        .attr("width", width / years.length)
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScale(d.month - 1.5))
        .attr("fill", d => legendThreshold(baseTemperature + d.variance))
        .attr("data-year", d => d.year)
        .attr("data-temp", d => baseTemperature + d.variance)
        .attr("data-month", d => d.month - 1)
        .on("mouseover", d => {
            tooltip
                .classed("tooltip--hidden", false)
                .style("left", xScale(d.year) + 80 + "px")
                .style("top", yScale(d.month - 1.5) - 40 + "px")
                .attr("data-year", d.year)
                .text(formatTooltipText({ ...d, baseTemperature }));
        })
        .on("mouseout", () => {
            tooltip.classed("tooltip--hidden", true);
        });

    const yAxis = d3.axisLeft(yScale).tickFormat(d => getMonthName(d));

    const xAxis = d3.axisBottom(xScale).tickFormat(d => {
        const date = new Date(d, 0);
        return date.getFullYear();
    });

    svg.append("g")
        .attr("id", "y-axis")
        .call(yAxis);

    svg.append("g")
        .attr("id", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);

    //legend
    const legendScale = d3
        .scaleLinear()
        .domain([minTemp, maxTemp])
        .range([0, legendWidth]);

    legend
        .selectAll("rect")
        .data(colors)
        .enter()
        .append("rect")
        .attr("x", (d, i) => legendScale([minTemp, ...legendTicks][i]))
        .attr("y", 0)
        .attr("width", (d, i) => {
            const ticks = [minTemp, ...legendTicks, maxTemp];
            return legendScale(ticks[i + 1] - ticks[i] + minTemp);
        })
        .attr("height", legendHeight)
        .attr("fill", d => d);

    const legendAxis = d3
        .axisBottom(legendScale)
        .tickValues(legendThreshold.domain())
        .tickFormat(d3.format(".1f"));

    legend
        .append("g")
        .attr("id", "temp-axis")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);
}

function getMonthName(month) {
    const date = new Date();
    date.setMonth(month);
    return date.toLocaleString("default", { month: "long" });
}

function formatTooltipText(data) {
    const { year, month, variance, baseTemperature } = data;

    return `${year} - ${getMonthName(month - 1)}\n${(
        baseTemperature + variance
    ).toFixed(1)}℃\n${variance.toFixed(1)}℃`;
}
