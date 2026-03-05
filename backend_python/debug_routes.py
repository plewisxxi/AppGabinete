from app.main import app

print("Listing all registered routes:")
for route in app.routes:
    if hasattr(route, 'path'):
        print(f"Path: {route.path}")
    elif hasattr(route, 'routes'):
        for sub_route in route.routes:
             print(f"Mount Path: {route.path} - Subpath: {sub_route.path}")
