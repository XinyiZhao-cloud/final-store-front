# Store Front Service
# CST8915: Cloud-Native App for Best Buy

**Student Name**: Xinyi Zhao    
**Student ID**: 040953633    
**Course**: CST8915 Full-stack Cloud-native Development  
**Semester**: Winter 2026   

## Overview
The Store Front Service is the customer-facing web application for the Best Buy cloud-native application.

## Responsibilities
- Display product catalog
- Add items to cart
- Remove items from cart
- Submit checkout requests
- Render order confirmation page

## Tech Stack
- Node.js
- Express.js
- EJS
- express-session
- Docker
- Azure Kubernetes Service (AKS)

## Main Routes
- `GET /` — Display storefront
- `POST /cart/add` — Add item to cart
- `GET /cart` — View cart
- `POST /cart/remove` — Remove item from cart
- `POST /checkout` — Submit order

## Deployment
This service is containerized using Docker and exposed externally through a LoadBalancer service in AKS.

## CI/CD
A GitHub Actions workflow is used to:
- Build the Docker image
- Push the image to Docker Hub
- Restart the Kubernetes deployment automatically

## Notes
This service uses Product Service and Order Service internally through Kubernetes service communication.
