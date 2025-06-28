import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np

# Data for the network components
data = [
    {"component": "Browser", "connections": 10, "type": "client"},
    {"component": "Web Workers", "connections": 4, "type": "processing"},
    {"component": "Service Worker", "connections": 1, "type": "caching"},
    {"component": "API Endpoints", "connections": 3, "type": "server"},
    {"component": "Test Servers", "connections": 5, "type": "infrastructure"}
]

df = pd.DataFrame(data)

# Define positions for each component in the network
positions = {
    "Browser": (1, 4),
    "Web Workers": (2, 3),
    "Service Worker": (3, 4),
    "API Endpoints": (4, 3),
    "Test Servers": (5, 2)
}

# Define connections between components (flow direction)
connections = [
    ("Browser", "Web Workers"),
    ("Browser", "Service Worker"),
    ("Web Workers", "API Endpoints"),
    ("API Endpoints", "Test Servers"),
    ("Service Worker", "API Endpoints")
]

# Brand colors
colors = ['#1FB8CD', '#FFC185', '#ECEBD5', '#5D878F', '#D2BA4C']

# Create the figure
fig = go.Figure()

# Add connection lines first (so they appear behind nodes)
for i, (from_comp, to_comp) in enumerate(connections):
    x0, y0 = positions[from_comp]
    x1, y1 = positions[to_comp]
    
    fig.add_trace(go.Scatter(
        x=[x0, x1],
        y=[y0, y1],
        mode='lines',
        line=dict(color='#13343B', width=2, dash='solid'),
        showlegend=False,
        hoverinfo='skip',
        cliponaxis=False
    ))

# Add nodes for each component
for i, (comp, pos) in enumerate(positions.items()):
    x, y = pos
    connections_count = df[df['component'] == comp]['connections'].iloc[0]
    comp_type = df[df['component'] == comp]['type'].iloc[0]
    
    # Shorten component names to fit 15 char limit
    display_name = comp
    if comp == "Service Worker":
        display_name = "Service Work"
    elif comp == "API Endpoints":
        display_name = "API Endpoint"
    elif comp == "Test Servers":
        display_name = "Test Server"
    
    fig.add_trace(go.Scatter(
        x=[x],
        y=[y],
        mode='markers+text',
        marker=dict(
            size=40,
            color=colors[i % len(colors)],
            line=dict(width=2, color='white')
        ),
        text=f"{display_name}<br>{connections_count}",
        textposition="middle center",
        textfont=dict(size=10, color='black'),
        name=f"{display_name} ({connections_count})",
        hovertemplate=f"<b>{comp}</b><br>Connections: {connections_count}<br>Type: {comp_type}<extra></extra>",
        cliponaxis=False
    ))

# Update layout
fig.update_layout(
    title="Speed Test App Architecture",
    showlegend=True,
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    xaxis=dict(
        showgrid=False,
        showticklabels=False,
        zeroline=False,
        range=[0, 6]
    ),
    yaxis=dict(
        showgrid=False,
        showticklabels=False,
        zeroline=False,
        range=[1, 5]
    ),
    plot_bgcolor='rgba(0,0,0,0)',
    paper_bgcolor='rgba(0,0,0,0)'
)

# Save the chart
fig.write_image("speed_test_architecture.png")