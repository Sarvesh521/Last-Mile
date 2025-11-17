package com.lastmile.notification.grpc;

import com.lastmile.notification.proto.*;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@GrpcService
public class NotificationGrpcService extends NotificationServiceGrpc.NotificationServiceImplBase {
    
    private final Map<String, List<Notification>> notifications = new ConcurrentHashMap<>();
    
    @Override
    public void sendNotification(SendNotificationRequest request,
                                 StreamObserver<SendNotificationResponse> responseObserver) {
        String userId = request.getUserId();
        String message = request.getMessage();
        com.lastmile.notification.proto.NotificationType type = request.getType();
        
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setMessage(message);
        notification.setType(type.name());
        notification.setTimestamp(System.currentTimeMillis());
        
        notifications.computeIfAbsent(userId, k -> new ArrayList<>()).add(notification);
        
        SendNotificationResponse response = SendNotificationResponse.newBuilder()
                .setSuccess(true)
                .setMessage("Notification sent successfully")
                .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
    
    @Override
    public void sendMatchNotification(SendMatchNotificationRequest request,
                                     StreamObserver<SendMatchNotificationResponse> responseObserver) {
        String driverId = request.getDriverId();
        String riderId = request.getRiderId();
        String matchId = request.getMatchId();
        String tripId = request.getTripId();
        
        String driverMessage = "You have been matched with a rider. Trip ID: " + tripId;
        String riderMessage = "You have been matched with a driver. Trip ID: " + tripId;
        
        Notification driverNotification = new Notification();
        driverNotification.setUserId(driverId);
        driverNotification.setMessage(driverMessage);
        driverNotification.setType("MATCH");
        driverNotification.setTimestamp(System.currentTimeMillis());
        
        Notification riderNotification = new Notification();
        riderNotification.setUserId(riderId);
        riderNotification.setMessage(riderMessage);
        riderNotification.setType("MATCH");
        riderNotification.setTimestamp(System.currentTimeMillis());
        
        notifications.computeIfAbsent(driverId, k -> new ArrayList<>()).add(driverNotification);
        notifications.computeIfAbsent(riderId, k -> new ArrayList<>()).add(riderNotification);
        
        SendMatchNotificationResponse response = SendMatchNotificationResponse.newBuilder()
                .setSuccess(true)
                .setMessage("Match notifications sent successfully")
                .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
    
    private static class Notification {
        private String userId;
        private String message;
        private String type;
        private long timestamp;
        
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    }
}

