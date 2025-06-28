import plotly.graph_objects as go
import plotly.io as pio

# Data from the provided JSON
data = [
    {"method": "Traditional Image Download", "accuracy": 65},
    {"method": "Chunked Data Transfer", "accuracy": 78},
    {"method": "Multi-threaded Testing", "accuracy": 85},
    {"method": "Web Workers Implementation", "accuracy": 90},
    {"method": "Service Worker + Web Workers", "accuracy": 95}
]

# Extract methods and accuracy values
methods = [item["method"] for item in data]
accuracy = [item["accuracy"] for item in data]

# Abbreviate method names to fit 15 character limit
abbreviated_methods = [
    "Traditional Img",
    "Chunked Data",
    "Multi-threaded",
    "Web Workers",
    "Service+Web"
]

# Create horizontal bar chart
fig = go.Figure()

fig.add_trace(go.Bar(
    y=abbreviated_methods,
    x=accuracy,
    orientation='h',
    marker_color='#1FB8CD',  # Using the primary brand color (strong cyan/blue)
    text=[f'{acc}%' for acc in accuracy],  # Data labels
    textposition='inside',
    textfont=dict(color='white', size=12),
    cliponaxis=False
))

# Update layout
fig.update_layout(
    title='Speed Testing Accuracy',
    xaxis_title='Accuracy %',
    yaxis_title='Method'
)

# Update axes
fig.update_xaxes(range=[0, 100])

# Save the chart
fig.write_image('speed_testing_accuracy.png')